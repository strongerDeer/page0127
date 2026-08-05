-- 아이디(username) 변경 정책 — 형식·중복·예약어·1회 제한을 DB에서 강제한다
-- 작성일: 2026-08-05
--
-- 왜 DB인가:
-- profiles 의 UPDATE 정책은 행 단위(auth.uid() = id)라 컬럼을 막지 못한다.
-- 즉 로그인 사용자는 브라우저에서 anon 키로 자기 username 을 무제한 바꿀 수 있다.
-- 서버 액션에만 "1회 제한"을 두면 우회되므로, 계약을 여기에 박는다.

-- =====================================================
-- 1. 변경 시각 컬럼 — NULL 이면 "아직 한 번도 안 바꿈"
-- =====================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

COMMENT ON COLUMN profiles.username_changed_at IS
  '아이디를 바꾼 시각. NULL 이면 가입 시 자동 발급된 상태(변경 기회 1회 남음).';

-- =====================================================
-- 2. 예약어 — /[username] 이 정적 라우트와 충돌하는 것을 막는다
-- =====================================================
--
-- Next.js 는 정적 경로를 동적 경로보다 먼저 매칭한다. 그래서 username 이
-- 'about' 인 사용자가 생기면 그 사람의 공개 서재는 영원히 열리지 않고
-- 소개 페이지가 뜬다. 라우트가 늘면 이 목록에도 한 줄 추가해야 한다.
--
-- IMMUTABLE 이어야 CHECK 제약에서 쓸 수 있다(입력이 같으면 항상 같은 답).
CREATE OR REPLACE FUNCTION is_reserved_username(candidate text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(candidate) = ANY (ARRAY[
    -- 실제 라우트 (app/ 최상위 세그먼트)
    'admin', 'api', 'auth', 'login', 'logout', 'settings',
    'books', 'dashboard', 'feed', 'notifications', 'search',
    'about', 'contact', 'privacy', 'terms',
    -- Next.js 파일 규칙이 만드는 최상위 경로
    'sitemap', 'sitemap.xml', 'robots', 'robots.txt',
    'opengraph-image', 'icon', 'favicon', 'favicon.ico',
    '_next', 'static', 'public', 'well-known',
    -- 아직 없지만 만들면 충돌하는 것들 — 미리 잡아둔다
    'help', 'support', 'blog', 'pricing', 'signup', 'register',
    'me', 'new', 'edit', 'delete', 'account', 'profile', 'user', 'users',
    'null', 'undefined', 'page0127'
  ]);
$$;

COMMENT ON FUNCTION is_reserved_username(text) IS
  '공개 서재 주소로 쓸 수 없는 아이디인지 판정. 정적 라우트와의 충돌 방지용.';

-- =====================================================
-- 3. 기존 데이터 정리 — 제약을 걸기 전에 위반 행을 먼저 고친다
-- =====================================================
--
-- 제약을 그냥 걸면 이미 있는 행 때문에 마이그레이션이 실패한다.
-- 순서가 중요하다: 형식 → 예약어 → 대소문자 중복.

-- 3-1. 형식 위반(NULL·빈 문자열·너무 짧음·허용 밖 문자)을 안전한 값으로 교체
--      generateUsernameFromEmail 이 한글 이메일에서 빈 문자열을 만들던 결함의 잔재를 함께 흡수한다.
UPDATE profiles
SET username = 'reader' || substr(md5(id::text), 1, 8)
WHERE username IS NULL
   OR username !~ '^[a-z0-9_]{3,20}$';

-- 3-2. 예약어를 쓰고 있는 행 교체
UPDATE profiles
SET username = 'reader' || substr(md5(id::text), 1, 8)
WHERE is_reserved_username(username);

-- 3-3. lower() 중복 제거 — 유니크 인덱스를 걸기 위한 안전망.
--      실제로는 3-1 이 대문자를 이미 전부 걷어냈고 기존 UNIQUE 제약이 완전 동일한
--      값을 막고 있어 여기서 걸리는 행은 보통 0건이다(로컬 검증에서도 0건).
--      제약이 없는 DB에 이 마이그레이션이 적용되는 경우를 대비해 남겨 둔다.
--      걸릴 경우 가장 먼저 만들어진 계정이 아이디를 지키고 나머지가 바뀐다.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY lower(username)
           ORDER BY created_at NULLS LAST, id
         ) AS rn
  FROM profiles
  WHERE username IS NOT NULL
)
UPDATE profiles p
SET username = 'reader' || substr(md5(p.id::text), 1, 8)
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

-- =====================================================
-- 4. 형식·예약어 제약
-- =====================================================
--
-- 3~20자, 영소문자·숫자·언더스코어만. 대문자를 아예 못 넣게 해서
-- "/Hong 과 /hong 이 다른 주소"인 혼란을 원천 차단한다.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_username_not_reserved;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_not_reserved
  CHECK (username IS NULL OR NOT is_reserved_username(username));

-- =====================================================
-- 5. 대소문자 구분 없는 유일성
-- =====================================================
--
-- 기존 TEXT UNIQUE 는 'Hong' 과 'hong' 을 서로 다른 값으로 본다.
-- 4번 제약이 대문자를 막으므로 실질적으로는 중복될 수 없지만,
-- 인덱스로도 못 박아 두어 나중에 제약을 완화해도 안전하게 만든다.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON profiles (lower(username))
  WHERE username IS NOT NULL;

-- =====================================================
-- 6. 변경 1회 제한 트리거
-- =====================================================
--
-- 서버 액션이 아니라 여기서 막는다(파일 상단 주석 참조).
--
-- ⚠️ username 이 바뀔 때만 검사하면 뚫린다. RLS 가 컬럼을 막지 못하므로
--    사용자는 username 은 그대로 둔 채 username_changed_at 만 NULL 로 되돌려
--    변경 기회를 무한히 리셋할 수 있다(로컬에서 재현 확인함).
--    그래서 username_changed_at 은 **서버 소유 컬럼**으로 취급한다 —
--    일반 사용자가 보낸 값은 어떤 경우에도 채택하지 않는다.
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
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 클라이언트가 보낸 username_changed_at 은 버리고 기존 값을 유지한다.
  -- (아이디를 안 바꾸는 일반 저장에서도 반드시 거쳐야 하는 줄이다)
  NEW.username_changed_at := OLD.username_changed_at;

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

DROP TRIGGER IF EXISTS profiles_username_change_limit ON profiles;

CREATE TRIGGER profiles_username_change_limit
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_username_change_limit();

-- =====================================================
-- 7. 권한 — 함수는 필요한 롤에만 연다
-- =====================================================
--
-- 20260725000001_lock_down_function_privileges.sql 의 방침을 따른다:
-- PUBLIC 에서 회수하고 실제로 쓰는 롤에만 부여한다.
REVOKE ALL ON FUNCTION is_reserved_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_reserved_username(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION enforce_username_change_limit() FROM PUBLIC;

-- Migration 완료
-- - username 형식(3~20자 소문자/숫자/_)·예약어·대소문자 무시 유일성을 DB가 강제
-- - 변경은 1회. 트리거가 막으므로 클라이언트에서 우회 불가
-- - username_changed_at 이 NULL 이면 아직 기회가 남은 상태
