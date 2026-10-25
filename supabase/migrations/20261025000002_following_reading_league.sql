-- 요청자의 팔로잉만 집계한다. DEFINER는 RLS를 우회하므로 본인도 공개 완독만 센다.
CREATE OR REPLACE FUNCTION public.get_following_reading_league()
RETURNS TABLE (
  user_id uuid,
  username text,
  nickname text,
  photo_url text,
  library_year integer,
  completed_books bigint,
  total_pages bigint,
  missing_page_books bigint,
  books_rank bigint,
  pages_rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH context AS (
    SELECT auth.uid() AS viewer,
      extract(year FROM now() AT TIME ZONE 'Asia/Seoul')::integer AS year
  ), members AS (
    SELECT c.viewer AS id FROM context c WHERE c.viewer IS NOT NULL
    UNION
    SELECT f.following_id FROM public.follows f
    JOIN context c ON f.follower_id = c.viewer
  ), readings AS (
    SELECT DISTINCT ON (b.user_id, COALESCE('isbn:' || NULLIF(b.isbn, ''), 'id:' || b.id::text))
      b.user_id, b.page_count
    FROM public.books b
    JOIN members m ON m.id = b.user_id
    CROSS JOIN context c
    WHERE b.is_public = true AND b.status = 'completed'
      AND COALESCE(extract(year FROM b.completed_date)::integer, b.completed_year) = c.year
    -- 기간을 먼저 자른 후 대표 회독을 고른다. dedupeReadings와 같은 순서다.
    ORDER BY b.user_id, COALESCE('isbn:' || NULLIF(b.isbn, ''), 'id:' || b.id::text),
      date_trunc('milliseconds', COALESCE(b.completed_date::timestamp AT TIME ZONE 'UTC', b.created_at)) DESC,
      b.read_count DESC, b.id DESC
  ), totals AS (
    SELECT m.id, count(r.user_id) AS books,
      COALESCE(sum(r.page_count), 0)::bigint AS pages,
      count(r.user_id) FILTER (WHERE r.page_count IS NULL) AS missing
    FROM members m LEFT JOIN readings r ON r.user_id = m.id
    GROUP BY m.id
  ), ranked AS (
    SELECT t.*,
      CASE WHEN t.books > 0 THEN rank() OVER (ORDER BY t.books DESC) END AS book_rank,
      CASE WHEN t.pages > 0 THEN rank() OVER (ORDER BY t.pages DESC) END AS page_rank
    FROM totals t
  )
  SELECT p.id, p.username, p.nickname, p.photo_url, c.year,
    r.books, r.pages, r.missing, r.book_rank, r.page_rank
  FROM ranked r JOIN public.profiles p ON p.id = r.id
  CROSS JOIN context c
  ORDER BY r.books DESC, COALESCE(p.nickname, p.username, ''), p.id;
$$;

REVOKE ALL ON FUNCTION public.get_following_reading_league() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_following_reading_league() TO authenticated;
COMMENT ON FUNCTION public.get_following_reading_league() IS
  '서울 기준 올해, 본인과 팔로잉의 공개 완독 기록만 집계. 재독은 한 권, 0은 순위 없음.';

NOTIFY pgrst, 'reload schema';
