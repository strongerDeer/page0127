-- 낯선 발신자가 일방적인 팔로우만으로 개인 메시지를 보내지 못하게 한다.
CREATE OR REPLACE FUNCTION public.send_reading_envelope(
  p_user_id uuid, p_message text, p_book_id uuid DEFAULT NULL, p_kind text DEFAULT 'recommendation',
  p_catalog_book_id uuid DEFAULT NULL, p_page_count integer DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE envelope_id uuid; wording text; inserted integer; sender uuid := auth.uid();
BEGIN
  IF sender IS NULL OR sender = p_user_id OR NOT EXISTS (
    SELECT 1 FROM public.follows WHERE follower_id = sender AND following_id = p_user_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.follows WHERE follower_id = p_user_id AND following_id = sender
  ) THEN RAISE EXCEPTION '맞팔한 사이에만 보낼 수 있어요.'; END IF;
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

-- 현재 앱에서 쓰지 않는 이전 전송 RPC로 맞팔 제한을 우회할 수 없어야 한다.
REVOKE ALL ON FUNCTION public.send_reading_nudge(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

-- 화면의 여러 버튼이 보낼 수 있는 상대 목록을 한 번만 읽는다. 수신 설정은 노출하지 않는다.
CREATE FUNCTION public.get_reading_nudge_recipients()
RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT f.following_id FROM public.follows f
  JOIN public.follows r ON r.follower_id = f.following_id AND r.following_id = f.follower_id
  WHERE f.follower_id = auth.uid() AND f.following_id <> auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_reading_nudge_recipients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reading_nudge_recipients() TO authenticated;
NOTIFY pgrst, 'reload schema';
