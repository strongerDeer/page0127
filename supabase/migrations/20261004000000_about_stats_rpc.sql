-- 소개 페이지 숫자 섹션: 개수 세 개만 돌려준다.
--
-- 왜 SECURITY DEFINER 인가: books·ai_usage_logs 는 RLS 로 본인 행만 보인다.
-- 익명 방문자가 전체 개수를 보려면 소유자 권한으로 세야 한다.
-- 행 내용은 나가지 않고 숫자 셋만 나간다 — 공개 여부와 무관하게 전체를 센다.
--
-- '리더' = 책을 1권 이상 기록한 사람. profiles 를 세면 가입만 하고 떠난 계정까지
-- 들어가므로 books.user_id 의 서로 다른 값을 센다.
CREATE OR REPLACE FUNCTION public.get_about_stats()
RETURNS TABLE (books BIGINT, readers BIGINT, matches BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.books),
    (SELECT COUNT(DISTINCT user_id) FROM public.books),
    (SELECT COUNT(*) FROM public.ai_usage_logs WHERE feature = 'compatibility');
$$;

-- 20260725000001_lock_down_function_privileges.sql 이후 새 함수는 기본 비공개다.
-- 비로그인 방문자도 소개 페이지를 보므로 anon 까지 연다.
REVOKE EXECUTE ON FUNCTION public.get_about_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_about_stats() TO anon, authenticated;
