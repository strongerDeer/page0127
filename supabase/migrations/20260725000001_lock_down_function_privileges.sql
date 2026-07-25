-- public 함수 실행 권한을 명시적 allowlist로 전환한다.
--
-- 20260724000000_grant_public_privileges.sql 의
--   grant execute on all functions in schema public to anon, authenticated;
-- 가 앞선 보안 마이그레이션에서 회수한 SECURITY DEFINER 함수 권한까지 다시
-- 열었다. SECURITY DEFINER는 함수 소유자 권한으로 실행되므로 테이블 RLS만으로
-- 보호되지 않는다.

-- 기존 함수: 우선 전부 닫고 필요한 함수만 아래에서 다시 연다.
revoke execute on all functions in schema public from public, anon, authenticated;

-- 앞으로 생성되는 함수도 기본 비공개. 새 공개 RPC는 마이그레이션에서 명시적으로
-- grant 해야 한다.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

-- 공개 도서 랭킹 조회: 랜딩과 공개 도서 화면에서 비로그인 방문자도 사용한다.
grant execute on function public.get_books_of_life(integer)
  to anon, authenticated;
grant execute on function public.get_most_read_books(integer)
  to anon, authenticated;
grant execute on function public.get_book_ranking_with_delta(text, integer)
  to anon, authenticated;

-- AI 사용량 예약: 함수 안에서 auth.uid()와 월 한도를 검증하므로 로그인 사용자만.
grant execute on function public.reserve_ai_usage(text)
  to authenticated;

-- 쓰기/관리 함수: 서버의 service_role 클라이언트만 호출한다.
grant execute on function public.increment_rate_limit(text)
  to service_role;
grant execute on function public.snapshot_book_rankings(date, integer)
  to service_role;

comment on function public.increment_rate_limit(text) is
  '현재 1분 윈도우의 요청 횟수를 증가시킨다. service_role 전용.';
comment on function public.snapshot_book_rankings(date, integer) is
  '일별 랭킹 스냅샷을 기록한다. service_role 전용.';
