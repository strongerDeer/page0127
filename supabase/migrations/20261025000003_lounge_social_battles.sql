-- 비교는 공개 기록만, 권유는 하루 한 번만 허용한다. 사용자 기록은 바꾸지 않는다.
CREATE TABLE public.reading_nudge_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true
);
ALTER TABLE public.reading_nudge_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.reading_nudge_settings TO authenticated;
CREATE POLICY "Read own nudge preference" ON public.reading_nudge_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own nudge preference" ON public.reading_nudge_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own nudge preference" ON public.reading_nudge_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 알림 삭제와 관계없이 발송 제한이 유지되어야 한다.
CREATE TABLE public.reading_nudge_limits (
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_day date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  PRIMARY KEY (actor_id, user_id, sent_day)
);
ALTER TABLE public.reading_nudge_limits ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.reading_nudge_limits TO authenticated;
CREATE POLICY "Read own sent nudges" ON public.reading_nudge_limits
  FOR SELECT TO authenticated USING (auth.uid() = actor_id);

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'comment', 'like', 'reading_reminder', 'weekly_recap', 'reading_nudge'));
-- REST 직접 INSERT로 RPC의 수신 설정과 발송 제한을 우회할 수 없어야 한다.
DROP POLICY IF EXISTS "Users can create notifications as themselves" ON public.notifications;
CREATE POLICY "Users can create notifications as themselves" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = actor_id AND user_id <> actor_id
    AND type IN ('follow', 'comment', 'like') AND message IS NULL);

CREATE FUNCTION public.send_reading_nudge(p_user_id uuid, p_message text DEFAULT 'together', p_book_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  sender uuid := auth.uid();
  wording text;
  notification_id uuid;
  inserted integer;
BEGIN
  IF sender IS NULL OR sender = p_user_id OR NOT EXISTS (
    SELECT 1 FROM public.follows f WHERE f.follower_id = sender AND f.following_id = p_user_id
  ) THEN RAISE EXCEPTION '팔로우하는 상대에게만 보낼 수 있어요.'; END IF;
  IF EXISTS (SELECT 1 FROM public.reading_nudge_settings s WHERE s.user_id = p_user_id AND NOT s.enabled)
    THEN RAISE EXCEPTION '상대가 콕 찌르기 알림을 꺼두었어요.'; END IF;
  wording := CASE p_message
    WHEN 'together' THEN '같이 한 권 읽자 👀'
    WHEN 'chase' THEN '여기까지 따라와 봐 👀'
    WHEN 'wait' THEN '기다려, 다음 책 골랐다 📖'
    WHEN 'next' THEN '다음 한 권으로 승부 보자'
    WHEN 'reading' THEN '요즘 무슨 책 읽어?'
  END;
  IF wording IS NULL THEN RAISE EXCEPTION '보낼 문구를 골라주세요.'; END IF;
  IF p_book_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.books b WHERE b.id = p_book_id AND b.user_id = sender
      AND b.is_public = true AND b.status IN ('reading', 'completed')
  ) THEN RAISE EXCEPTION '내 공개 독서 기록만 첨부할 수 있어요.'; END IF;
  INSERT INTO public.reading_nudge_limits(actor_id, user_id) VALUES (sender, p_user_id)
    ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN RAISE EXCEPTION '오늘은 이미 콕 찔렀어요. 내일 다시 만나요.'; END IF;
  INSERT INTO public.notifications(user_id, actor_id, type, message, target_id, target_type)
    VALUES (p_user_id, sender, 'reading_nudge', wording, p_book_id,
      CASE WHEN p_book_id IS NOT NULL THEN 'book' END)
    RETURNING id INTO notification_id;
  RETURN notification_id;
END;
$$;
REVOKE ALL ON FUNCTION public.send_reading_nudge(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_reading_nudge(uuid, text, uuid) TO authenticated;

CREATE FUNCTION public.get_following_reading_social()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH context AS (
    SELECT auth.uid() AS viewer, extract(year FROM now() AT TIME ZONE 'Asia/Seoul')::int AS year
  ), members AS (
    SELECT viewer AS id FROM context WHERE viewer IS NOT NULL
    UNION SELECT following_id FROM public.follows f JOIN context c ON f.follower_id = c.viewer
  ), visible AS (
    SELECT b.*,
      COALESCE('isbn:' || NULLIF(b.isbn, ''), 'id:' || b.id::text) AS book_key,
      COALESCE(extract(year FROM b.completed_date)::int, b.completed_year) AS year
    FROM public.books b JOIN members m ON m.id = b.user_id
    WHERE b.is_public = true AND b.status = 'completed'
  ), year_books AS (
    SELECT DISTINCT ON (v.user_id, v.book_key) v.* FROM visible v CROSS JOIN context c
    WHERE v.year = c.year
    ORDER BY v.user_id, v.book_key,
      date_trunc('milliseconds', COALESCE(v.completed_date::timestamp AT TIME ZONE 'UTC', v.created_at)) DESC,
      v.read_count DESC, v.id DESC
  ), latest AS (
    SELECT DISTINCT ON (v.user_id, v.book_key) v.* FROM visible v
    ORDER BY v.user_id, v.book_key,
      date_trunc('milliseconds', COALESCE(v.completed_date::timestamp AT TIME ZONE 'UTC', v.created_at)) DESC,
      v.read_count DESC, v.id DESC
  ), genres AS (
    SELECT m.id AS user_id, COALESCE(jsonb_agg(DISTINCT y.category)
      FILTER (WHERE NULLIF(trim(y.category), '') IS NOT NULL), '[]'::jsonb) AS categories
    FROM members m LEFT JOIN year_books y ON y.user_id = m.id GROUP BY m.id
  ), clashes AS (
    -- 공통 책은 완독 연도를 제한하지 않는다. 오래된 독서도 대화의 계기가 된다.
    SELECT mine.id AS mine_book_id, other.id AS other_book_id, other.user_id AS other_user_id,
      mine.title, mine.author, mine.cover_image, mine.provider_item_id, mine.isbn,
      mine.rating AS mine_rating, other.rating AS other_rating,
      abs(mine.rating - other.rating) AS rating_gap
    FROM latest mine CROSS JOIN context c JOIN latest other
      ON other.isbn = mine.isbn AND NULLIF(mine.isbn, '') IS NOT NULL
      AND other.user_id <> c.viewer
    WHERE mine.user_id = c.viewer AND mine.rating BETWEEN 1 AND 5
      AND other.rating BETWEEN 1 AND 5 AND mine.rating <> other.rating
    ORDER BY rating_gap DESC, other.user_id, mine.id LIMIT 12
  )
  SELECT jsonb_build_object('year', c.year,
    'genres', COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.user_id) FROM genres g), '[]'::jsonb),
    'clashes', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM clashes t), '[]'::jsonb))
  FROM context c WHERE c.viewer IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_following_reading_social() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_following_reading_social() TO authenticated;
NOTIFY pgrst, 'reload schema';
