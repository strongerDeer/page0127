-- /sentence 주소가 생겼으므로 'sentence' 를 사용자 이름 예약어에 넣는다
-- (TS RESERVED_USERNAMES 와 같아야 한다 — reservedRoutes.test.ts 가 확인)
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
    'updates', 'onboarding', 'library', 'icons', 'demo', 'sentence',
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

-- 이미 'sentence' 를 쓰는 사람이 있으면 임시 이름으로 바꾼다(운영엔 없을 것으로 본다)
UPDATE profiles
SET username = 'reader' || substr(md5(id::text), 1, 8)
WHERE is_reserved_username(username);

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_username_not_reserved;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_not_reserved
  CHECK (username IS NULL OR NOT is_reserved_username(username));

REVOKE ALL ON FUNCTION is_reserved_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_reserved_username(text) TO anon, authenticated, service_role;
