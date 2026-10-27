-- 기존 수락·중복 방지 로직을 유지하면서 완독의 인생책 표시를 같은 트랜잭션에 저장한다.
ALTER FUNCTION public.respond_reading_envelope(uuid, text, boolean, date, integer, integer, date)
  RENAME TO respond_reading_envelope_base;
REVOKE ALL ON FUNCTION public.respond_reading_envelope_base(uuid, text, boolean, date, integer, integer, date)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.respond_reading_envelope(
  p_notification_id uuid, p_action text, p_is_public boolean DEFAULT true,
  p_completed_date date DEFAULT NULL, p_completed_year integer DEFAULT NULL, p_rating integer DEFAULT NULL,
  p_start_date date DEFAULT NULL, p_is_life_book boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE response jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.'; END IF;
  IF p_is_life_book IS NULL OR (p_is_life_book AND p_action <> 'complete')
    OR p_rating NOT BETWEEN 0 AND 5 OR p_completed_year < 1900
    THEN RAISE EXCEPTION '완독 시점과 별점을 확인해 주세요.'; END IF;
  response := public.respond_reading_envelope_base(
    p_notification_id, p_action, p_is_public, p_completed_date, p_completed_year,
    CASE WHEN p_is_life_book THEN 5 ELSE NULLIF(p_rating, 0) END, p_start_date
  );
  -- 기존 완독은 덮어쓰지 않는다. 새 완독·상태 전환에만 이번 입력을 적용한다.
  IF p_action = 'complete' AND response->>'outcome' IN ('created', 'completed') THEN
    UPDATE public.books SET is_life_book = p_is_life_book,
      rating = CASE WHEN p_is_life_book THEN 5 WHEN p_rating = 0 THEN 0 ELSE rating END
      WHERE id = (response->>'book_id')::uuid AND user_id = auth.uid();
  END IF;
  RETURN response;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_reading_envelope(uuid, text, boolean, date, integer, integer, date, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_reading_envelope(uuid, text, boolean, date, integer, integer, date, boolean)
  TO authenticated;
NOTIFY pgrst, 'reload schema';
