-- 운영 DB에 적용된 마이그레이션 중 가장 높은 번호를 돌려준다.
--
-- 왜 필요한가 (2026-07-29 사고):
--   트랙 F 코드가 배포됐는데 운영 DB에 마이그레이션이 안 올라가 있었다. 그 결과
--   books.is_life_book 을 쓰는 조회가 전부 42703(column does not exist)으로
--   죽었는데, **모든 페이지가 HTTP 200 이었다.** 앱이 DB 에러를 삼키고 렌더를
--   계속하기 때문이다. 운영 DB에 직접 쿼리를 던져보고서야 발견했다.
--
--   /api/health 는 그때도 정상이었다. profiles 한 건만 조회해서 "DB에 닿는가"는
--   봤지만 "스키마가 배포된 코드와 맞는가"는 보지 않았기 때문이다.
--
--   이 함수는 그 빈칸을 채운다. 앱은 자기가 기대하는 번호를 알고 있고(빌드에 박힌
--   EXPECTED_MIGRATION_VERSION), 이 함수로 DB의 실제 번호를 읽어 비교한다.
--
-- 왜 security definer 인가:
--   supabase_migrations 스키마는 PostgREST 에 노출돼 있지 않고, 노출할 생각도 없다.
--   이 함수 하나만 창구로 열고 나머지는 닫아 둔다.
--
-- 왜 service_role 에만 주는가:
--   마이그레이션 번호는 배포 시각을 드러낸다. 대단한 비밀은 아니지만 익명에게
--   보여줄 이유도 없다. /api/health 는 서버에서 createAdminClient() 로 부른다.
--
-- search_path 를 비우는 이유:
--   security definer 함수는 호출자가 search_path 를 조작해 다른 스키마의 동명
--   객체를 가리키게 만들 수 있다. 빈 search_path + 스키마 전체 경로로 막는다.

create or replace function public.applied_migration_version()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select max(version) from supabase_migrations.schema_migrations;
$$;

comment on function public.applied_migration_version() is
  '운영 DB에 적용된 최신 마이그레이션 번호. /api/health 가 배포된 코드와 대조해 스키마 어긋남을 감지한다.';

-- 기본 권한을 걷어내고 service_role 에만 준다.
-- (public 스키마 함수는 기본적으로 PUBLIC 에 EXECUTE 가 열린다)
revoke all on function public.applied_migration_version() from public;
revoke all on function public.applied_migration_version() from anon;
revoke all on function public.applied_migration_version() from authenticated;
grant execute on function public.applied_migration_version() to service_role;
