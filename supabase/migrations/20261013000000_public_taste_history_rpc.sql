-- 서재 페이지 취향 카드: 방문자에게도 "성향 이름 · 날짜 · 좋아하는 주제"를 보여 준다.
--
-- 왜 RLS 를 열지 않고 함수인가: taste_analyses 의 SELECT 정책은 본인만이다.
-- 정책을 열면 긴 성향 설명·싫어하는 패턴·비용까지 통째로 나간다.
-- SECURITY DEFINER 함수로 공개해도 되는 칸만 골라 낸다(get_about_stats 와 같은 방식).
--
-- 공개 칸: id, personality_type, created_at, analyzed_books_count,
--          liked_topics(최신 1건만 — preference_profile->liked->topics)
-- 비공개 유지: personality_description, disliked, patterns, analysis_model, cost_in_cents
CREATE OR REPLACE FUNCTION public.get_public_taste_history(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  personality_type text,
  created_at timestamptz,
  analyzed_books_count integer,
  liked_topics text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.personality_type,
    t.created_at,
    t.analyzed_books_count,
    CASE
      WHEN row_number() OVER (ORDER BY t.created_at DESC) = 1
        THEN ARRAY(
          SELECT jsonb_array_elements_text(t.preference_profile -> 'liked' -> 'topics')
        )
    END
  FROM public.taste_analyses t
  WHERE t.user_id = p_user_id
  ORDER BY t.created_at DESC
  LIMIT 10;
$$;

-- 20260725000001_lock_down_function_privileges.sql 이후 새 함수는 기본 비공개다.
-- 비로그인 방문자도 서재를 보므로 anon 까지 연다.
REVOKE EXECUTE ON FUNCTION public.get_public_taste_history(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_taste_history(uuid) TO anon, authenticated;
