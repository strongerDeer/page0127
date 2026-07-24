-- 목적: 로컬/CI DB가 마이그레이션만으로 운영과 동일하게 "동작"하도록,
-- public 스키마의 역할별 접근 권한(GRANT)을 코드로 담는다.
--
-- 배경: 로컬은 마이그레이션만으로 스키마가 생성되는데 이 GRANT가 빠져 있어, 로그인 후
-- 앱이 프로필을 만들 때(authenticated 역할로 profiles upsert) "permission denied for
-- table profiles"로 막혔다. 운영은 대시보드가 권한을 자동 설정해 문제가 없었다(= 스키마
-- drift). 모든 구문은 idempotent하여 운영 반영도 안전하다.
--
-- 주의: 예전엔 이 파일에 "가입 시 profiles 자동생성 트리거(handle_new_user)"도 있었으나
-- 제거했다. 이유를 남겨둔다(같은 실수 반복 방지):
--   1) profiles 생성은 앱의 auth 콜백(entities/profile: ensureProfile)이 이미 담당한다 → 트리거는 중복.
--   2) 로컬에서 막혔던 진짜 원인은 트리거 부재가 아니라 위 GRANT 누락이었다.
--   3) 운영의 handle_new_user는 (앱이 쓰지 않는) 잔재 테이블 public.users를 채우는 별개 함수라,
--      "운영 재현"을 이유로 트리거 버전을 복원할 대상이 아니다.
--   4) 가입(auth.users insert) 경로에 트리거를 얹지 않는 편이 로그인 안정성에 안전하다.
--      (트리거 내부에서 에러가 나면 auth.users insert 자체가 롤백되어 가입이 통째로 막힌다.)

-- ── public 스키마 접근 권한(GRANT) ───────────────────────────────
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
