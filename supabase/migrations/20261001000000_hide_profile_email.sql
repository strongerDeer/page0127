-- profiles 의 비공개 컬럼(email·status·suspended_until)을 anon·authenticated 가 읽지 못하게 한다.
--
-- 왜 (2026-10-01 운영 실측):
--   profiles 는 `GRANT ALL ... TO anon` + `"Anyone can view profiles" USING (true)` 였다.
--   공개 서재 때문에 행은 누구나 읽어야 하지만, 그 탓에 브라우저에 실린 anon 키로
--   `/rest/v1/profiles?select=email` 을 한 번 부르면 **회원 이메일 전체**가 나왔다.
--   RLS 는 "어느 행"만 고를 수 있고 "어느 컬럼"은 못 고른다 — 그래서 컬럼 권한으로 막는다.
--
-- 무엇을 바꾸나:
--   테이블 단위 SELECT 를 거두고, 공개해도 되는 컬럼에만 SELECT 를 다시 준다.
--   INSERT·UPDATE·DELETE 권한은 그대로다(가입 시 앱이 email 을 써 넣는다).
--   service_role(어드민 회원 화면)은 건드리지 않으므로 계속 email 을 읽는다.
--
-- ⚠️ 이 마이그레이션 뒤로는 profiles 를 `select('*')` 로 읽으면 **쿼리 전체가 42501 로 실패**한다.
--    앱은 PROFILE_PUBLIC_COLUMNS 를 쓰고, app/profile-select-usage.test.ts 가 `*` 를 막는다.
-- ⚠️ profiles 에 공개 컬럼을 추가하면 아래 grant 목록에도 넣어야 한다. 안 넣으면 그 컬럼을
--    읽는 조회가 42501 로 죽는다(새 컬럼은 기본적으로 비공개가 되는 셈이라 안전한 쪽으로 깨진다).

-- ── 1. email 은 DB 가 auth.users 에서 채운다 ─────────────────────────────
--
-- 왜 앱이 안 쓰나:
--   PostgREST upsert 는 보낸 컬럼을 전부 `SET col = EXCLUDED.col` 로 만든다. 그런데
--   `SET email = EXCLUDED.email` 은 email 의 **SELECT 권한**을 요구한다(로컬 실측: 42501).
--   아래 2번으로 SELECT 를 거두면 email 을 담은 가입 upsert 가 통째로 실패해 **신규 가입이 막힌다.**
--   그래서 앱은 email 을 보내지 않고, 이 트리거가 매 insert·update 마다 auth.users 값으로 맞춘다.
--   덤으로 사용자가 REST 로 자기 행의 email 을 아무 값으로나 바꾸던 구멍도 닫힌다.

create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.users 는 일반 역할이 못 읽는다. 그래서 SECURITY DEFINER(소유자 권한)로 읽는다.
  select u.email into new.email from auth.users u where u.id = new.id;
  return new;
end;
$$;

-- 트리거 함수는 실행 권한 없이도 발동한다. 직접 호출 경로는 닫아 둔다.
revoke execute on function public.sync_profile_email_from_auth() from public, anon, authenticated;

drop trigger if exists profiles_sync_email_from_auth on public.profiles;
create trigger profiles_sync_email_from_auth
  before insert or update on public.profiles
  for each row execute function public.sync_profile_email_from_auth();

-- 기존 행도 한 번 맞춘다(지금 값과 다르거나 비어 있는 행만 — update 가 위 트리거를 태운다).
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is distinct from u.email;

-- ── 2. 컬럼 단위 SELECT 권한 ─────────────────────────────────────────────

revoke select on table public.profiles from anon, authenticated;

grant select (
  id,
  username,
  username_changed_at,
  onboarded_at,
  nickname,
  bio,
  photo_url,
  reading_goal,
  created_at,
  updated_at
) on table public.profiles to anon, authenticated;
