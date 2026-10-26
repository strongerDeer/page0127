-- 기존 수신 동의는 앱 내 알림에 대한 동의였다. 잠금화면 알림은 별도로 켠다.
ALTER TABLE public.reading_nudge_settings ADD COLUMN push_enabled boolean NOT NULL DEFAULT false;

-- 알림 본문은 기존 읽음 처리 정책으로 수정할 수 있으므로 수락의 근거는 별도로 보관한다.
CREATE TABLE public.reading_envelopes (
  notification_id uuid PRIMARY KEY REFERENCES public.notifications(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  catalog_book_id uuid REFERENCES public.global_books(id) ON DELETE SET NULL,
  catalog_page_count integer CHECK (catalog_page_count >= 0),
  kind text NOT NULL CHECK (kind IN ('recommendation', 'invitation', 'note')),
  saved_book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  saved_at timestamptz,
  accepted_at timestamptz,
  CHECK (actor_id <> user_id)
);
CREATE INDEX reading_envelopes_recipient_source_idx ON public.reading_envelopes(user_id, source_book_id);
CREATE INDEX reading_envelopes_recipient_catalog_idx ON public.reading_envelopes(user_id, catalog_book_id);
ALTER TABLE public.reading_envelopes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reading_envelopes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.reading_envelopes TO authenticated;
CREATE POLICY "Read own received envelopes" ON public.reading_envelopes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 이전의 '같이 읽자' 문구는 정식 초대가 아니었으므로 추천으로만 취급한다.
INSERT INTO public.reading_envelopes(notification_id, actor_id, user_id, source_book_id, kind)
SELECT n.id, n.actor_id, n.user_id, b.id, CASE WHEN b.id IS NULL THEN 'note' ELSE 'recommendation' END
FROM public.notifications n LEFT JOIN public.books b
  ON b.id = n.target_id AND b.user_id = n.actor_id AND b.is_public
WHERE n.type = 'reading_nudge' AND n.actor_id <> n.user_id;

CREATE FUNCTION public.send_reading_envelope(
  p_user_id uuid, p_message text, p_book_id uuid DEFAULT NULL, p_kind text DEFAULT 'recommendation',
  p_catalog_book_id uuid DEFAULT NULL, p_page_count integer DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE envelope_id uuid; wording text; inserted integer; sender uuid := auth.uid();
BEGIN
  IF sender IS NULL OR sender = p_user_id OR NOT EXISTS (
    SELECT 1 FROM public.follows WHERE follower_id = sender AND following_id = p_user_id
  ) THEN RAISE EXCEPTION '팔로우하는 상대에게만 보낼 수 있어요.'; END IF;
  IF EXISTS (SELECT 1 FROM public.reading_nudge_settings WHERE user_id = p_user_id AND NOT enabled)
    THEN RAISE EXCEPTION '상대가 메시지 알림을 꺼두었어요.'; END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('recommendation', 'invitation', 'note') THEN
    RAISE EXCEPTION '봉투 종류를 확인해 주세요.';
  END IF;
  IF p_kind <> 'note' AND p_book_id IS NULL AND p_catalog_book_id IS NULL THEN
    RAISE EXCEPTION '함께 보낼 책을 골라주세요.';
  END IF;
  IF p_book_id IS NOT NULL AND (p_catalog_book_id IS NOT NULL OR NOT EXISTS (
    SELECT 1 FROM public.books WHERE id = p_book_id AND user_id = sender AND is_public AND status IN ('reading','completed')
  )) THEN RAISE EXCEPTION '첨부할 책을 확인해 주세요.'; END IF;
  IF p_catalog_book_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.global_books WHERE id = p_catalog_book_id)
    THEN RAISE EXCEPTION '검색한 책을 찾을 수 없어요.'; END IF;
  wording := trim(p_message);
  IF wording IS NULL OR length(wording) NOT BETWEEN 1 AND 200 OR p_page_count < 0 THEN
    RAISE EXCEPTION '메시지는 1~200자로 적어주세요.';
  END IF;
  INSERT INTO public.reading_nudge_limits(actor_id,user_id) VALUES (sender,p_user_id) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN RAISE EXCEPTION '오늘은 이미 메시지를 보냈어요. 내일 다시 만나요.'; END IF;
  INSERT INTO public.notifications(user_id,actor_id,type,message,target_id,target_type)
    VALUES (p_user_id,sender,'reading_nudge',wording,COALESCE(p_catalog_book_id,p_book_id),
      CASE WHEN p_catalog_book_id IS NOT NULL THEN 'global_book' WHEN p_book_id IS NOT NULL THEN 'book' END)
    RETURNING id INTO envelope_id;
  INSERT INTO public.reading_envelopes(notification_id,actor_id,user_id,source_book_id,catalog_book_id,catalog_page_count,kind)
    VALUES (envelope_id,sender,p_user_id,p_book_id,p_catalog_book_id,p_page_count,p_kind);
  RETURN envelope_id;
END;
$$;
REVOKE ALL ON FUNCTION public.send_reading_envelope(uuid, text, uuid, text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_reading_envelope(uuid, text, uuid, text, uuid, integer) TO authenticated;

CREATE FUNCTION public.respond_reading_envelope(
  p_notification_id uuid, p_action text, p_is_public boolean DEFAULT true,
  p_completed_date date DEFAULT NULL, p_completed_year integer DEFAULT NULL, p_rating integer DEFAULT NULL,
  p_start_date date DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  viewer uuid := auth.uid();
  envelope public.reading_envelopes%ROWTYPE;
  source_book public.books%ROWTYPE;
  own_book public.books%ROWTYPE;
  result_kind text := 'existing';
BEGIN
  IF viewer IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.'; END IF;
  IF p_action IS NULL OR p_action NOT IN ('save', 'accept', 'complete') OR p_is_public IS NULL THEN
    RAISE EXCEPTION '요청을 확인해 주세요.';
  END IF;
  IF (p_completed_date IS NOT NULL AND p_completed_year IS NOT NULL)
    OR p_completed_date > (now() AT TIME ZONE 'Asia/Seoul')::date
    OR p_completed_year NOT BETWEEN 1800 AND extract(year FROM now() AT TIME ZONE 'Asia/Seoul')::int
    OR p_rating NOT BETWEEN 1 AND 5 OR p_start_date > (now() AT TIME ZONE 'Asia/Seoul')::date
    THEN RAISE EXCEPTION '날짜와 별점을 확인해 주세요.'; END IF;
  -- 서로 다른 봉투를 동시에 열어도 한 사람의 같은 책이 중복 생성되지 않는다.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(viewer::text, 0));
  SELECT * INTO envelope FROM public.reading_envelopes
    WHERE notification_id = p_notification_id AND user_id = viewer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '받은 책 봉투를 찾을 수 없어요.'; END IF;
  IF p_action = 'accept' AND envelope.kind <> 'invitation' THEN
    RAISE EXCEPTION '같이 읽기 초대장만 수락할 수 있어요.';
  END IF;
  IF envelope.catalog_book_id IS NOT NULL THEN
    SELECT (jsonb_populate_record(NULL::public.books, to_jsonb(g))).* INTO source_book
      FROM public.global_books g WHERE g.id = envelope.catalog_book_id;
  ELSE
    SELECT * INTO source_book FROM public.books
      WHERE id = envelope.source_book_id AND user_id = envelope.actor_id
        AND is_public AND status IN ('reading', 'completed') FOR SHARE;
  END IF;
  IF source_book.id IS NULL THEN RAISE EXCEPTION '지금은 첨부한 책을 볼 수 없어요.'; END IF;

  SELECT b.* INTO own_book FROM public.books b WHERE b.user_id = viewer AND (
    (NULLIF(source_book.isbn, '') IS NOT NULL AND b.isbn = source_book.isbn)
    OR (NULLIF(source_book.provider_item_id, '') IS NOT NULL
      AND b.provider_item_id = source_book.provider_item_id AND b.source IS NOT DISTINCT FROM source_book.source)
    OR b.id IN (SELECT e.saved_book_id FROM public.reading_envelopes e
      WHERE e.user_id = viewer AND ((envelope.source_book_id IS NOT NULL AND e.source_book_id = envelope.source_book_id)
        OR (envelope.catalog_book_id IS NOT NULL AND e.catalog_book_id = envelope.catalog_book_id)))
  ) ORDER BY CASE b.status WHEN 'reading' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
    b.created_at DESC, b.id LIMIT 1 FOR UPDATE;

  IF NOT FOUND THEN
    -- 별점·리뷰·메모·회독·완독 날짜는 보낸 사람의 기록이므로 복사하지 않는다.
    INSERT INTO public.books(user_id, isbn, title, sub_title, author, publisher, cover_image,
      spine_image, description, pub_date, category, page_count, source, provider_item_id,
      status, start_date, is_public, read_count, completed_date, completed_year, rating)
    VALUES (viewer, source_book.isbn, source_book.title, source_book.sub_title, source_book.author,
      source_book.publisher, source_book.cover_image, source_book.spine_image, source_book.description,
      source_book.pub_date, source_book.category, COALESCE(source_book.page_count,envelope.catalog_page_count), source_book.source,
      source_book.provider_item_id, CASE p_action WHEN 'accept' THEN 'reading' WHEN 'complete' THEN 'completed' ELSE 'want_to_read' END,
      CASE WHEN p_action = 'accept' THEN COALESCE(p_start_date,(now() AT TIME ZONE 'Asia/Seoul')::date) END, p_is_public, 1,
      CASE WHEN p_action = 'complete' THEN p_completed_date END,
      CASE WHEN p_action = 'complete' THEN p_completed_year END, CASE WHEN p_action = 'complete' THEN p_rating END)
    RETURNING * INTO own_book;
    result_kind := 'created';
    INSERT INTO public.activities(user_id, book_id, activity_type) VALUES (viewer, own_book.id,
      CASE WHEN p_action = 'complete' THEN 'book_completed' ELSE 'book_added' END);
  ELSIF p_action = 'accept' AND own_book.status = 'want_to_read' THEN
    UPDATE public.books SET status = 'reading', start_date = COALESCE(p_start_date,(now() AT TIME ZONE 'Asia/Seoul')::date),
      updated_at = now() WHERE id = own_book.id RETURNING * INTO own_book;
    result_kind := 'started';
  ELSIF p_action = 'complete' AND own_book.status <> 'completed' THEN
    UPDATE public.books SET status='completed', completed_date=p_completed_date, completed_year=p_completed_year,
      rating=p_rating, updated_at=now() WHERE id=own_book.id RETURNING * INTO own_book;
    INSERT INTO public.activities(user_id,book_id,activity_type) VALUES(viewer,own_book.id,'book_completed');
    result_kind := 'completed';
  END IF;

  UPDATE public.reading_envelopes SET saved_book_id = own_book.id, saved_at = COALESCE(saved_at, now()),
    accepted_at = CASE WHEN p_action = 'accept' AND own_book.status = 'reading'
      THEN COALESCE(accepted_at, now()) ELSE accepted_at END
    WHERE notification_id = p_notification_id RETURNING * INTO envelope;
  RETURN jsonb_build_object('book_id', own_book.id, 'status', own_book.status, 'outcome', result_kind,
    'saved_at', envelope.saved_at, 'accepted_at', envelope.accepted_at);
END;
$$;
REVOKE ALL ON FUNCTION public.respond_reading_envelope(uuid, text, boolean, date, integer, integer, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_reading_envelope(uuid, text, boolean, date, integer, integer, date) TO authenticated;
NOTIFY pgrst, 'reload schema';
