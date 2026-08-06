-- 첫 로그인 온보딩 상태
--
-- 지금은 가입할 때 아이디가 이메일·닉네임에서 **자동으로** 만들어지고, 사용자는
-- 그 사실을 모른 채 공개 서재 주소를 갖게 된다. 카카오 가입자는 한국어 닉네임이면
-- `reader_xxxxxx` 같은 값을 받는다. 첫 로그인 때 직접 정하게 하려고 상태를 둔다.
--
-- NULL = 아직 온보딩을 안 마쳤다.

-- =====================================================
-- 1. 컬럼 추가
-- =====================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

COMMENT ON COLUMN profiles.onboarded_at IS
  '첫 로그인 온보딩을 마친 시각. NULL 이면 미완료 — 로그인 후 온보딩으로 보낸다. '
  '서버 소유 컬럼이다(아래 트리거가 클라이언트 값을 버린다).';

-- =====================================================
-- 2. 기존 사용자 백필
-- =====================================================
-- ⚠️ 이걸 빠뜨리면 배포하는 순간 **모든 기존 사용자가 온보딩 화면으로 튕긴다.**
--    이미 쓰고 있던 사람에게 갑자기 "아이디를 정하세요"가 뜨는 셈이다.
--    가입 시각을 쓰지 않고 now() 로 채운다 — "언제 온보딩했나"가 아니라
--    "온보딩 대상이 아니다"를 표시하는 게 목적이다.

UPDATE profiles
SET onboarded_at = now()
WHERE onboarded_at IS NULL;

-- =====================================================
-- 3. onboarded_at 을 서버 소유 컬럼으로 만든다
-- =====================================================
-- 왜 필요한가 — 이걸 안 막으면 **아이디 변경 1회 제한이 뚫린다.**
--
--   1. 사용자가 프로필 저장으로 onboarded_at 을 NULL 로 되돌린다
--      (RLS 는 행 단위라 특정 컬럼만 막지 못한다)
--   2. 다음 로그인에 온보딩 화면이 다시 뜬다
--   3. 온보딩은 service_role 로 아이디를 정하므로 username_changed_at 을
--      소진하지 않는다 → 아이디를 무한히 바꿀 수 있다
--
-- username_changed_at 과 같은 방식으로 막는다: 클라이언트가 보낸 값은
-- 어떤 경우에도 채택하지 않고 기존 값을 유지한다.
--
-- service_role 은 예외다(함수 첫 줄에서 그대로 통과). 온보딩 서버 액션이
-- 그 경로로 값을 넣고, 지원 요청이 오면 운영자가 되돌릴 수 있다.
--
-- ⚠️ 아래는 20260805000000 의 함수를 **통째로 다시 정의**한 것이다.
--    그 파일을 고칠 때 이 파일도 같이 봐야 한다 — 나중 정의가 이긴다.

CREATE OR REPLACE FUNCTION enforce_username_change_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- 운영자(service_role)는 제한을 받지 않는다.
  -- 값을 덮지 않고 그대로 통과시키므로, 지원 요청("오타로 바꿨어요")이 오면
  -- username_changed_at 을 NULL 로 되돌려 기회를 한 번 더 줄 수 있다.
  -- 온보딩 서버 액션도 이 경로로 아이디·onboarded_at 을 한 번에 쓴다.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 클라이언트가 보낸 서버 소유 컬럼 값은 버리고 기존 값을 유지한다.
  -- (아이디를 안 바꾸는 일반 저장에서도 반드시 거쳐야 하는 줄이다)
  NEW.username_changed_at := OLD.username_changed_at;
  NEW.onboarded_at := OLD.onboarded_at;

  -- 아이디가 그대로면 여기서 끝(닉네임·사진만 바꾼 일반 저장)
  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  -- 이미 한 번 바꿨으면 거부
  IF OLD.username_changed_at IS NOT NULL THEN
    RAISE EXCEPTION 'username_change_limit_exceeded'
      USING HINT = '아이디는 한 번만 변경할 수 있습니다.';
  END IF;

  -- 변경 시각은 서버 시각으로 기록한다
  NEW.username_changed_at := now();
  RETURN NEW;
END;
$$;

-- 트리거 자체는 이미 붙어 있다(20260805000000). 함수만 바꿔 끼운다.

-- =====================================================
-- 확인용
-- =====================================================
-- - onboarded_at 이 NULL 인 사람만 온보딩 대상이다
-- - 배포 직후에는 0명이어야 한다 (2번 백필)
--     SELECT count(*) FROM profiles WHERE onboarded_at IS NULL;
