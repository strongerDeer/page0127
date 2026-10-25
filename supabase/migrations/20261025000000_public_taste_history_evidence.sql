-- 서재 취향 카드에 "이 책들에서 읽었어요" — 최신 분석의 근거 책(preference_profile.evidence)을 함께 준다.
--
-- ⚠️ 근거는 공개 책만: 분석은 비공개 책까지 넣어 돌리므로 근거에 비공개 책이 뽑힐 수 있다.
--    방문자에게 그 제목·표지가 나가면 숨긴 책이 드러난다. 근거마다 books 를 다시 보고
--    지금 공개된 책만 남긴다(주인이 나중에 비공개로 돌린 책도 바로 빠진다).
--    주인에게는 전부 — analyzed_books_count 와 같은 규칙(auth.uid() 는 호출자의 JWT 를 읽는다).
--
-- book_id 는 text 로 비교한다 — JSON 에 이상한 값이 들어 있어도 uuid 캐스팅 오류로
-- 함수 전체가 죽지 않게. 근거가 없는 옛 분석은 빈 배열이다.
--
-- 반환 칸이 바뀌므로 CREATE OR REPLACE 로는 안 된다 — 지우고 다시 만든다.
-- 앱은 evidence 칸이 없어도(이 마이그레이션 전) 근거만 숨기고 그대로 돈다.

DROP FUNCTION IF EXISTS public.get_public_taste_history(uuid);

CREATE FUNCTION public.get_public_taste_history(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  personality_type text,
  created_at timestamptz,
  analyzed_books_count integer,
  liked_topics text[],
  evidence jsonb
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
    CASE WHEN auth.uid() = p_user_id THEN t.analyzed_books_count END,
    CASE
      WHEN row_number() OVER (ORDER BY t.created_at DESC) = 1
        THEN ARRAY(
          SELECT jsonb_array_elements_text(t.preference_profile -> 'liked' -> 'topics')
        )
    END,
    CASE
      WHEN row_number() OVER (ORDER BY t.created_at DESC) = 1
        THEN (
          SELECT COALESCE(jsonb_agg(e.item ORDER BY e.ord), '[]'::jsonb)
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(t.preference_profile -> 'evidence') = 'array'
                THEN t.preference_profile -> 'evidence'
              ELSE '[]'::jsonb
            END
          ) WITH ORDINALITY AS e(item, ord)
          WHERE EXISTS (
            SELECT 1
            FROM public.books b
            WHERE b.id::text = e.item ->> 'book_id'
              AND b.user_id = p_user_id
              AND (b.is_public = true OR auth.uid() = p_user_id)
          )
        )
    END
  FROM public.taste_analyses t
  WHERE t.user_id = p_user_id
  ORDER BY t.created_at DESC
  LIMIT 10;
$$;

-- 20260725000001_lock_down_function_privileges.sql 이후 새 함수는 기본 비공개다.
-- 비로그인 방문자도 서재를 보므로 anon 까지 연다(20261013000000 과 같다).
REVOKE EXECUTE ON FUNCTION public.get_public_taste_history(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_taste_history(uuid) TO anon, authenticated;
