-- 읽기 가이드 — 책 한 권의 인물관계도·연표·산책 코스
-- 작성일: 2026-11-21
--
-- 결정 (HJ, 2026-11-20):
--   - 내용은 한 번만 입력하고 두 곳에 쓴다: 책 정보 페이지(/books/info/[id])의 HTML,
--     그리고 인스타 카드(1080×1350) 캡처. 그래서 화면이 아니라 데이터로 저장한다.
--   - 스포일러는 넣지 않는다(초반 설정까지만) — 접기 버튼 없음.
--   - 입력은 어드민에서 JSON 붙여넣기 + 미리보기.
--
-- 왜 JSONB 한 칸인가:
--   인물·관계·연표는 책마다 모양이 다르고, 늘 "책 한 권 분량을 통째로" 읽고 쓴다.
--   인물 표를 따로 정규화하면 조인·정렬·부분 수정만 복잡해진다. 대신 DB 는 JSON 모양을
--   검사하지 않으므로, 저장하는 서버 코드가 스키마(bookGuideSchema.ts)로 검사한다.
--   여기서는 "배열이다" 까지만 지킨다.

CREATE TABLE IF NOT EXISTS public.book_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 책 한 권에 가이드 하나 — unique 가 그 규칙이다
  global_book_id uuid NOT NULL UNIQUE
    REFERENCES public.global_books(id) ON DELETE CASCADE,
  -- draft 는 어드민에서만 보인다. published 가 되어야 책 정보 페이지에 나온다
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  sections jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(sections) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.book_guides ENABLE ROW LEVEL SECURITY;

-- 누구나(로그인 없이도) 발행된 가이드만 읽는다. 책 정보 페이지는 익명 클라이언트로 그린다.
-- 쓰기 정책은 없다 — 어드민 서버 액션이 service role 로만 쓴다(RLS 우회).
CREATE POLICY "Anyone reads published book guides" ON public.book_guides
  FOR SELECT TO anon, authenticated USING (status = 'published');

-- 수정 시각은 DB 가 찍는다(기존 공용 트리거 함수 재사용)
CREATE TRIGGER update_book_guides_updated_at
  BEFORE UPDATE ON public.book_guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
