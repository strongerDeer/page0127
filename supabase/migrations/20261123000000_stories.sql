-- 책 이야기(/blog) — HJ 의 독후감·인물관계도를 어드민에서 쓰고 바로 올린다
-- 작성일: 2026-11-23
--
-- 결정 (HJ, 2026-11-23 C안):
--   글마다 배포하지 않는다. 어드민(/admin/stories)에서 저장하면 서버 액션이 이 표에 쓰고
--   /blog 페이지 캐시만 다시 만든다(on-demand revalidation).
--
-- 한 책에 글 여러 편을 허용한다(book_id unique 아님) — 다시 읽은 감상 등. 책 정보 페이지는 최신 한 편만 잇는다.
-- 인물 목록·관계도 그림은 글마다 모양이 같고 늘 통째로 읽고 쓰므로 JSONB 로 둔다.
-- JSON 모양은 저장하는 서버 코드(features/admin-stories/model/storyForm.ts)가 검사한다.

CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 주소 /blog/{slug} — 영문 소문자·숫자·하이픈
  slug text NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80),
  -- 책 정보 페이지(/books/info/[id])와 서로 잇는 기준. 책이 지워져도 글은 남지 않게 막는다
  book_id uuid NOT NULL REFERENCES public.global_books(id) ON DELETE RESTRICT,
  -- 책 제목·저자는 글을 쓸 때 한 번 복사해 둔다 — 책 행을 못 읽어도(검수 상태 등) 글은 그려진다
  book_title text NOT NULL,
  book_author text NOT NULL DEFAULT '',
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  -- 독후감 본문(마크다운)
  body text NOT NULL DEFAULT '',
  -- 0 = 별점 안 보임, 1~5
  rating smallint NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  -- 관계도 전체 그림 {src,width,height,alt} — 없으면 관계도 칸을 그리지 않는다
  map_image jsonb CHECK (map_image IS NULL OR jsonb_typeof(map_image) = 'object'),
  -- 모바일용 분할 카드 [{src,width,height,alt}]
  map_cards jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(map_cards) = 'array'),
  -- 등장인물 [{name, people:[{name, role}]}] — 그림 속 글자를 검색엔진이 읽도록 HTML 로도 그린다
  characters jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(characters) = 'array'),
  is_published boolean NOT NULL DEFAULT false,
  -- 처음 공개한 시각. 공개를 껐다 켜도 그대로(글 날짜가 바뀌지 않게)
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stories_published_has_date CHECK (NOT is_published OR published_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS stories_published_idx
  ON public.stories (published_at DESC) WHERE is_published;
CREATE INDEX IF NOT EXISTS stories_book_id_idx ON public.stories (book_id);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- 누구나(로그인 없이도) 공개된 글만 읽는다. /blog 는 익명 클라이언트로 그린다.
-- 쓰기 정책은 없다 — 어드민 서버 액션이 service role 로만 쓴다(RLS 우회).
DROP POLICY IF EXISTS "Anyone reads published stories" ON public.stories;
CREATE POLICY "Anyone reads published stories" ON public.stories
  FOR SELECT TO anon, authenticated USING (is_published);

DROP TRIGGER IF EXISTS update_stories_updated_at ON public.stories;
CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 관계도·카드 그림 버킷: 공개 읽기, 쓰기 정책 없음(서버 액션이 service role 로만 올림).
-- 관계도는 글자가 작아 크게 둔다 — 브라우저가 긴 변 2400px WEBP 로 줄여 보낸다.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('story-images', 'story-images', true, 3145728, ARRAY['image/webp', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read for story images'
  ) THEN
    CREATE POLICY "Public read for story images" ON storage.objects
      FOR SELECT USING (bucket_id = 'story-images');
  END IF;
END $$;

-- 첫 글: 대온실 수리 보고서 — 비공개 초안으로 넣는다. HJ 가 어드민에서 독후감을 쓰고 공개한다.
-- 책 id 는 운영 DB 기준이라, 그 책이 없는 DB(dev)에서는 건너뛴다.
-- 그림은 리포 public/images/stories/ 에 있는 파일을 그대로 쓴다(나중에 어드민에서 바꿀 수 있다).
INSERT INTO public.stories (slug, book_id, book_title, book_author, title, description, body, map_image, characters)
SELECT
  'daeonsil-repair-report',
  gb.id,
  '대온실 수리 보고서',
  '김금희',
  '대온실 수리 보고서 독후감과 인물관계도',
  '김금희 장편소설 『대온실 수리 보고서』 인물관계도. 2023년 대온실 수리 현장, 2003년 낙원하숙, 1909년 기록 속 사람들과 작품 속 동화까지 스포일러 없이 정리했어요.',
  '『대온실 수리 보고서』는 시간이 세 겹으로 겹쳐 있는 소설이에요. 2023년, 창경궁 대온실 수리 공사의 보고서를 맡게 된 영두의 현재가 있고, 영두가 중학생 시절 원서동 낙원하숙에서 보낸 2003년이 있고, 대온실이 처음 세워진 1909년부터의 기록이 있어요. 그 사이사이에 작품 속 동화 한 편이 끼어 있고요.

등장인물이 많아서 처음에는 누가 어느 시간의 사람인지 헷갈리기 쉬워요. 아래 인물관계도는 그 네 묶음을 한 장에 정리한 거예요. 영두를 가운데 두고 따라가면 길을 잃지 않아요.',
  '{"src": "/images/stories/daeonsil/character-map.webp", "width": 1024, "height": 1536, "alt": "대온실 수리 보고서 인물관계도 — 강영두를 중심으로 현재(2023), 낙원하숙(2003), 과거 기록(1909년부터), 작품 속 동화의 인물들"}'::jsonb,
  '[{"name": "현재 · 2023", "people": [{"name": "강영두", "role": "대온실 수리 보고서를 쓰는 사람"}, {"name": "은혜", "role": "영두의 소꿉친구 · 공인중개사"}, {"name": "산아", "role": "은혜의 딸 · 초등학생, 어린이 회장"}, {"name": "스미", "role": "산아와 같은 반"}, {"name": "오태양", "role": "산아와 같은 반"}]}, {"name": "바위건축사사무소", "people": [{"name": "연희", "role": "사무소 소장"}, {"name": "소목수", "role": "사무소 동업자"}, {"name": "은세창", "role": "대리 · 작도"}, {"name": "제갈도희", "role": "디자이너 · 제도"}]}, {"name": "동궐관리청", "people": [{"name": "장과장", "role": "과장"}, {"name": "왕주웅", "role": "주무관"}, {"name": "오아랑", "role": "학예연구사"}]}, {"name": "낙원하숙 · 2003", "people": [{"name": "안문자", "role": "낙원하숙 주인 · 영두가 하숙한 집"}, {"name": "리사", "role": "안문자의 손녀 · 하숙생"}, {"name": "딩 아주머니", "role": "하숙집 살림"}, {"name": "유화 언니", "role": "연극하는 하숙생"}, {"name": "삼우씨", "role": "법대생 하숙생"}, {"name": "이순신", "role": "뒷집 공고생 · 영두의 첫사랑"}, {"name": "안나", "role": "영두의 학교 친구"}, {"name": "빽", "role": "영두의 학교 친구 · 전교 1등"}]}, {"name": "과거 기록 · 1909년부터", "people": [{"name": "후쿠다 노보루", "role": "대온실 공사 책임자"}, {"name": "기노시타 코주", "role": "식물원 책임자"}, {"name": "가마야마 마사시", "role": "대온실 관리자 · 기노시타의 상관"}]}, {"name": "작품 속 동화 「배고픈 쿠마 센세이」", "people": [{"name": "마리코 히메", "role": "동화 속 화자"}, {"name": "쿠마 센세이", "role": "곰 선생님"}, {"name": "빨간 등", "role": "원숭이"}, {"name": "고무장화", "role": "사육사"}, {"name": "조류 박사", "role": "원장"}, {"name": "오니아이", "role": "식물원 · 동물원 대장"}]}]'::jsonb
FROM public.global_books gb
WHERE gb.id = '2685df6a-7c49-4fb2-8bb0-2837665827ac'
ON CONFLICT (slug) DO NOTHING;
