-- 피드 책별 중복 제거용 뷰
--
-- 왜 뷰인가: supabase-js 쿼리 빌더로는 DISTINCT ON 을 쓸 수 없다. RPC 로 바꾸면
-- app/api/feed/route.ts 를 통째로 다시 써야 하므로, 뷰를 두어 기존 코드 모양
-- (.from(...).select(...).in(...).order(...).range(...))을 그대로 유지한다.
--
-- security_invoker = true: 밑단 activities 테이블의 RLS 가 조회자 기준으로 그대로
-- 적용된다. 뷰가 권한 우회 구멍이 되지 않는다(기본값은 뷰 소유자 권한이라 위험하다).
CREATE OR REPLACE VIEW public.book_latest_activities
WITH (security_invoker = true) AS
SELECT DISTINCT ON (book_id)
  id,
  user_id,
  activity_type,
  book_id,
  content,
  created_at
FROM public.activities
ORDER BY book_id, created_at DESC;

-- 20260725000001 에서 기본 권한을 좁혀뒀으므로 명시적으로 부여한다.
GRANT SELECT ON public.book_latest_activities TO anon, authenticated;

COMMENT ON VIEW public.book_latest_activities IS
  '책별 최신 활동 1행. 피드가 같은 책을 여러 장으로 띄우지 않게 한다.';
