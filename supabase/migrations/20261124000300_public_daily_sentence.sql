-- 오늘의 문장 — 로그인하지 않은 사람도 뽑는다
-- 작성일: 2026-11-24
--
-- 왜 (HJ, 2026-11-24): 오늘의 문장이 서재 캘린더 안에 숨어 있어 회원만, 그것도 찾아 들어가야 볼 수 있었다.
-- /sentence 페이지(홈·서재에서는 모달)로 꺼내고, 비회원도 하루 한 문장을 뽑게 한다.
-- 문장은 사람마다 다르다(HJ 결정) — 회원은 지금처럼 draw_daily_sentence()(안 본 문장 중 무작위 + 기록),
-- 비회원은 이 함수가 "브라우저 열쇠 + 오늘 날짜"로 한 문장을 정해 준다.
--
-- 왜 무작위(random())가 아니라 열쇠로 정하나:
--   비회원은 기록할 곳이 없다. 무작위로 주면 새로고침할 때마다 다른 문장이 나와 "하루 한 문장"이 깨지고,
--   새로고침만으로 풀 전체를 긁어 갈 수 있다. 같은 열쇠·같은 날이면 늘 같은 문장을 돌려준다.
--   (저장소를 지우면 열쇠가 바뀌어 다시 뽑을 수는 있다 — 한 번에 하나씩이라 감수한다. /api 레이트 리밋도 걸린다.)
--
-- 보안: 문장 표(daily_sentences)는 그대로 잠가 둔다(RLS: 내가 뽑은 문장만).
--   SECURITY DEFINER 함수가 "오늘 이 열쇠의 한 줄"만 꺼내 준다 — 표를 열지 않고 기능만 연다.
--   rights_note·is_active 같은 운영 칸은 돌려주지 않는다.
--   DB에 아무것도 쓰지 않는다 → 비회원 개인정보가 생기지 않는다.

CREATE OR REPLACE FUNCTION public.draw_public_sentence(p_key text)
RETURNS TABLE (
  draw_date date,
  sentence_id uuid,
  text text,
  book_title text,
  author text,
  translator text,
  page integer,
  isbn text,
  cover_image text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_count integer;
  v_offset integer;
BEGIN
  -- 열쇠는 브라우저가 만든 짧은 무작위 문자열이다. 이상한 값은 받지 않는다.
  IF p_key IS NULL OR p_key !~ '^[A-Za-z0-9_-]{8,64}$' THEN
    RAISE EXCEPTION 'invalid key' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_count FROM public.daily_sentences WHERE is_active;
  IF v_count = 0 THEN
    RETURN;
  END IF;

  -- hashtext 는 음수도 나온다 → 절댓값. bigint 로 올려 -2147483648 의 abs 넘침을 피한다.
  v_offset := (abs(hashtext(v_today::text || ':' || p_key)::bigint) % v_count)::integer;

  RETURN QUERY
  SELECT v_today, s.id, s.text, s.book_title, s.author, s.translator, s.page, s.isbn, s.cover_image
  FROM public.daily_sentences s
  WHERE s.is_active
  ORDER BY s.id
  OFFSET v_offset
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.draw_public_sentence(text) FROM public;
GRANT EXECUTE ON FUNCTION public.draw_public_sentence(text) TO anon, authenticated;
