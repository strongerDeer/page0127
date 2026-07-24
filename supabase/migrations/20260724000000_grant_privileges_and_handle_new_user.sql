-- 목적: 마이그레이션이 운영 DB를 완전히 재현하도록, 빠져 있던 두 가지를 코드로 담는다.
--   1) anon/authenticated/service_role 역할의 테이블·시퀀스·함수 접근 권한(GRANT)
--   2) 가입(auth.users insert) 시 public.profiles 자동 생성 트리거(handle_new_user)
--
-- 배경: 로컬 DB는 마이그레이션만으로 생성되는데 위 둘이 빠져 있어, 로그인 후 프로필
-- 생성이 "permission denied for table profiles"로 막혔다. 운영은 대시보드가 자동
-- 설정해 문제가 없었다(= 스키마 drift). 모든 구문은 idempotent하여 운영 반영도 안전하다.
-- (운영 반영 전엔 운영의 기존 트리거/권한과 한 번 대조할 것.)

-- ── 1) 권한(GRANT) ───────────────────────────────────────────────
-- RLS가 켜져 있으므로 테이블 권한을 넓게 줘도 실제 행 접근은 정책이 통제한다(Supabase 표준).
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- 앞으로 생성될 객체에도 동일 권한이 자동 적용되도록 기본 권한 설정
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- ── 2) 가입 시 프로필 자동 생성 ─────────────────────────────────
-- 이메일 앞부분으로 안전한(영문/숫자/_) username을 만들고, UNIQUE 충돌 시 숫자를 붙인다.
create or replace function public.generate_unique_username(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(split_part(coalesce(p_email, ''), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  if base_username is null or base_username = '' then
    base_username := 'user';
  end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  return final_username;
end;
$$;

-- 트리거 함수: auth.users에 새 유저가 생기면 profiles 한 줄을 만든다.
-- security definer라 RLS/권한을 우회해 안전하게 삽입한다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, public.generate_unique_username(new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3) 기존 가입자 백필 (트리거 도입 이전 유저의 프로필 보충) ──────
insert into public.profiles (id, email, username)
select u.id, u.email, public.generate_unique_username(u.email)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
