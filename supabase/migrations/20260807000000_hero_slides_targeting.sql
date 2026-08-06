-- 히어로 배너 — 노출 대상 · 예약 게시 · 클릭 집계
-- 작성일: 2026-08-07
--
-- 지금 운영 배너 4개가 **전부 href='/login'** 이다. 로그인한 사용자가 누르면
-- 로그인 페이지로 갔다가 되돌아온다. 즉 가입자에게는 히어로 전체가 죽어 있다.
-- 그런데 히어로는 랜딩에서 가장 큰 면이고, 가입자가 매번 처음 보는 화면이다.
--
-- 함께 넣는 둘:
--  - 예약 게시: "2026년 하반기" 같은 시의성 배너가 이미 있는데, 지금은 끝나는 날
--    새벽에 사람이 손으로 꺼야 한다.
--  - 클릭 집계: 무엇이 먹히는지 모르면 배너를 고칠 근거가 없다.

-- =====================================================
-- 1. 노출 대상
-- =====================================================
--
-- 슬라이드마다 정한다. "지금 가입하세요"는 비로그인에게만, "취향 분석 보기"는
-- 로그인에게만 보내야 각 문구가 거짓말이 되지 않는다.
ALTER TABLE hero_slides
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all'
    CHECK (audience IN ('all', 'guest', 'member'));

COMMENT ON COLUMN hero_slides.audience IS
  '노출 대상. all=모두 / guest=비로그인만 / member=로그인만.';

-- =====================================================
-- 2. 예약 게시
-- =====================================================
--
-- 둘 다 NULL 이면 "언제나" 다. 기존 슬라이드는 전부 그렇게 남는다.
ALTER TABLE hero_slides
  ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE hero_slides
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

COMMENT ON COLUMN hero_slides.starts_at IS
  '노출 시작. NULL 이면 제한 없음.';
COMMENT ON COLUMN hero_slides.ends_at IS
  '노출 종료(이 시각 이후 안 보임). NULL 이면 제한 없음.';

-- 끝이 시작보다 앞서는 기간은 영원히 안 보이는 배너다 — 저장 시점에 막는다.
ALTER TABLE hero_slides
  DROP CONSTRAINT IF EXISTS hero_slides_period_order;
ALTER TABLE hero_slides
  ADD CONSTRAINT hero_slides_period_order
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at);

-- =====================================================
-- 3. 클릭 집계
-- =====================================================
--
-- 어드민 목록에서 바로 보이는 단순 카운터. 기간별·유입경로별 분석은 GA 가 맡고
-- (cta_click 에 슬라이드 id 를 실어 보낸다), 여기서는 "어느 배너가 눌리나"만 센다.
-- 혼자 운영하면 GA 를 자주 안 열게 되는 게 현실이라 화면에 숫자를 남긴다.
ALTER TABLE hero_slides
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN hero_slides.click_count IS
  '배너 클릭 누적. 정밀 분석용이 아니라 어드민 목록에서 눈으로 비교하는 값이다.';

-- =====================================================
-- 4. 노출 조건을 한 곳에 둔다
-- =====================================================
--
-- 조건이 넷(활성·시작·종료·대상)으로 늘었다. 앱과 DB 에 각각 적으면 한쪽만
-- 고치는 날 어긋난다. 판정을 함수로 묶어 조회가 그것만 부르게 한다.
--
-- SECURITY INVOKER + STABLE: RLS 를 우회하지 않고, 같은 트랜잭션 안에서 now() 가
-- 고정된다(한 요청 안에서 슬라이드마다 다른 시각을 보면 안 된다).
CREATE OR REPLACE FUNCTION is_slide_visible(
  slide hero_slides,
  viewer_is_member boolean
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT slide.is_active
     AND (slide.starts_at IS NULL OR slide.starts_at <= now())
     AND (slide.ends_at   IS NULL OR slide.ends_at   >  now())
     AND (
       slide.audience = 'all'
       OR (slide.audience = 'member' AND viewer_is_member)
       OR (slide.audience = 'guest'  AND NOT viewer_is_member)
     );
$$;

COMMENT ON FUNCTION is_slide_visible(hero_slides, boolean) IS
  '배너 노출 판정. 활성·기간·대상을 한 번에 본다. 앱 조회가 이것만 부른다.';

-- =====================================================
-- 5. RLS — 기간이 지난 배너는 읽히지도 않게 한다
-- =====================================================
--
-- 기존 정책은 is_active 만 봤다. 그대로 두면 **예약 시작 전 배너의 문구가 anon
-- 키로 미리 읽힌다.** 배너는 공개 콘텐츠지만 "아직 안 띄운 것"은 공개가 아니다.
--
-- 대상(audience)은 여기서 거르지 않는다. RLS 는 로그인 여부만 알고, guest/member
-- 판정은 앱이 렌더 시점에 한다 — 정책에 auth.uid() 를 넣으면 비로그인 캐시와
-- 로그인 캐시가 섞이는 문제가 따라온다.
DROP POLICY IF EXISTS "anyone can read active slides" ON hero_slides;

CREATE POLICY "anyone can read published slides"
  ON hero_slides FOR SELECT
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at   IS NULL OR ends_at   >  now())
  );

-- =====================================================
-- 6. 클릭 카운터 증가 함수
-- =====================================================
--
-- 카운터만 올리는 좁은 통로를 연다. UPDATE 권한을 열면 배너 문구까지 고칠 수 있다.
-- SECURITY DEFINER 로 소유자 권한을 빌리되, 하는 일은 단 한 컬럼 +1 이다.
CREATE OR REPLACE FUNCTION increment_slide_click(p_slide_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 노출 조건을 만족하는 슬라이드만 센다. 지난 배너의 id 로 카운터를 부풀리는
  -- 것을 막는다(집계는 공개 API 로 열리므로 아무나 부를 수 있다).
  UPDATE hero_slides
  SET click_count = click_count + 1
  WHERE id = p_slide_id
    AND is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at   IS NULL OR ends_at   >  now());
END;
$$;

-- 20260725000001 방침: PUBLIC 회수 후 실제로 쓰는 롤에만 부여
REVOKE ALL ON FUNCTION increment_slide_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_slide_click(uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION is_slide_visible(hero_slides, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_slide_visible(hero_slides, boolean) TO anon, authenticated, service_role;

-- =====================================================
-- 7. 기존 배너를 대상에 맞게 정리
-- =====================================================
--
-- 넷 다 href='/login' 이라 로그인 사용자에게는 죽은 배너였다. 지금 있는 문구는
-- 전부 "가입을 권하는" 말이므로 비로그인 대상으로 내린다. 로그인 사용자용 배너는
-- 운영자가 어드민에서 새로 만든다(문구를 코드가 지어내지 않는다).
UPDATE hero_slides SET audience = 'guest' WHERE href = '/login';

-- Migration 완료
-- - audience — 슬라이드마다 노출 대상 (all/guest/member)
-- - starts_at·ends_at — 예약 게시. 기간이 지나면 RLS 가 읽히지도 않게 한다
-- - click_count + increment_slide_click() — 카운터만 올리는 좁은 통로
-- - is_slide_visible() — 노출 판정을 한 곳에
