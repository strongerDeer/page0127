-- 예약어 목록 갱신 — 8월 이후 생긴 최상위 라우트가 빠져 있던 것을 채운다
-- 작성일: 2026-11-07
--
-- 무엇이 문제였나:
-- 20260805000000 에서 예약어를 손으로 적은 뒤 /updates, /onboarding, /library 가
-- 새로 생겼지만 목록에는 추가되지 않았다. 그 아이디로 가입하면 Next.js 가 정적
-- 경로를 먼저 매칭하므로 그 사람의 공개 서재(/[username])가 영영 열리지 않는다.
--
-- 다시 빠뜨리지 않게:
-- apps/page0127/src/entities/profile/model/reservedRoutes.test.ts 가
--   1) app/ 최상위 경로·public/ 폴더가 전부 RESERVED_USERNAMES 에 있는지,
--   2) RESERVED_USERNAMES 와 **가장 최근** is_reserved_username() 정의가 같은지
-- CI 에서 확인한다. 라우트를 추가하면 TS 목록과 새 마이그레이션을 함께 올린다.

-- =====================================================
-- 1. 예약어 함수 교체
-- =====================================================
CREATE OR REPLACE FUNCTION is_reserved_username(candidate text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(candidate) = ANY (ARRAY[
    -- 실제 라우트 (app/ 최상위 세그먼트, route group 은 벗긴 이름)
    'admin', 'api', 'auth', 'login', 'logout', 'settings',
    'books', 'dashboard', 'feed', 'notifications', 'search',
    'about', 'contact', 'privacy', 'terms',
    'updates', 'onboarding', 'library', 'icons',
    -- public/ 폴더 — /[username]/... 하위 주소와 겹칠 수 있다
    'badges', 'brand', 'images', 'illustrations',
    -- Next.js 파일 규칙이 만드는 최상위 경로
    'sitemap', 'sitemap.xml', 'robots', 'robots.txt',
    'opengraph-image', 'icon', 'favicon', 'favicon.ico',
    '_next', 'static', 'public', 'well-known', 'manifest', 'offline',
    -- 아직 없지만 만들면 충돌하는 것들 — 미리 잡아둔다
    'help', 'support', 'blog', 'pricing', 'signup', 'register',
    'me', 'new', 'edit', 'delete', 'account', 'profile', 'user', 'users',
    'home', 'explore',
    'null', 'undefined', 'page0127'
  ]);
$$;

-- =====================================================
-- 2. 이미 새 예약어를 쓰고 있는 행 교체
-- =====================================================
--
-- 함수를 바꿔도 CHECK 제약은 기존 행을 다시 검사하지 않는다(IMMUTABLE 이라고
-- 약속했으니 Postgres 는 "답이 안 바뀌었을 것"이라고 믿는다). 그래서 위반 행을
-- 직접 고친 뒤 3번에서 제약을 다시 걸어 검증받는다.
-- 20260805000000 의 3-2 와 같은 규칙으로 바꾼다.
UPDATE profiles
SET username = 'reader' || substr(md5(id::text), 1, 8)
WHERE is_reserved_username(username);

-- =====================================================
-- 3. 제약 다시 걸기 — ADD CONSTRAINT 는 기존 행 전체를 검사한다
-- =====================================================
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_username_not_reserved;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_not_reserved
  CHECK (username IS NULL OR NOT is_reserved_username(username));

-- 권한은 CREATE OR REPLACE 가 유지하지만, 20260725000001 방침대로 명시해 둔다
REVOKE ALL ON FUNCTION is_reserved_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_reserved_username(text) TO anon, authenticated, service_role;

-- Migration 완료
-- - updates·onboarding·library·icons 등 새 예약어 반영
-- - 기존 위반 행은 reader+해시 로 교체 후 제약 재검증
