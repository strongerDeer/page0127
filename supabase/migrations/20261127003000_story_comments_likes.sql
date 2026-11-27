-- 책 이야기(/blog) 댓글·좋아요
-- 작성일: 2026-11-27
--
-- 왜 전용 테이블인가 (HJ, 2026-11-27 "B로 구분되어야지. 섞이는 건 그렇잖아"):
--   book_comments 는 "책"에 붙는 말(서재 기록·책 정보 페이지)이다. 책 이야기는 page0127. 이 쓴
--   글에 붙는 말이라 성격이 다르다. 한 테이블에 story_id 칸을 더하면(A안) 신고·트리거를 공짜로
--   얻지만, 정책을 따로 바꾸기 어렵고 "책 댓글" 집계(책 색인 판단 등)에 글 댓글이 섞일 위험이 있다.
--   그래서 story_comments 를 따로 만들고, 규칙(답글 1단계·부모와 같은 글·2000자·운영자 숨김)은
--   book_comments 와 똑같이 맞춘다. 화면 부품은 같은 것을 쓴다(CommentTarget 'story').
--
-- 신고: reports 가 지금은 book_comments 만 가리킨다. story_comment_id 칸을 더하고
--   "둘 중 정확히 하나"로 CHECK 를 넓힌다(book_comments_one_target 과 같은 방식).
--
-- 순서: dev db push → 운영 db push → 머지(앱이 새 테이블을 읽기 전에 테이블이 있어야 한다).

-- =====================================================
-- 1. story_comments
-- =====================================================
CREATE TABLE IF NOT EXISTS public.story_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 글이 지워지면 댓글도 같이 — 붙을 곳이 없는 말은 남길 이유가 없다
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  -- 탈퇴해도 대화 흐름은 남긴다(화면엔 "탈퇴한 회원")
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_comment_id uuid REFERENCES public.story_comments(id) ON DELETE CASCADE,
  content text NOT NULL
    CONSTRAINT story_comments_content_length
    CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  -- 운영자가 가린 댓글 — 지우지 않고 가린다(오판 복구·분쟁 기록)
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS story_comments_story_visible_idx
  ON public.story_comments (story_id, created_at)
  WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS story_comments_parent_idx
  ON public.story_comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS story_comments_user_idx
  ON public.story_comments (user_id);

DROP TRIGGER IF EXISTS update_story_comments_updated_at ON public.story_comments;
CREATE TRIGGER update_story_comments_updated_at
  BEFORE UPDATE ON public.story_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 답글은 1단계까지, 그리고 부모와 같은 글에만 — book_comments 트리거와 같은 규칙.
-- 오류 문구의 '1depth'·'다른 대상'은 앱(classifyBookCommentError)이 그대로 알아본다.
CREATE OR REPLACE FUNCTION public.check_story_comment_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_story uuid;
  parent_parent uuid;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT story_id, parent_comment_id INTO parent_story, parent_parent
  FROM public.story_comments WHERE id = NEW.parent_comment_id;

  IF parent_parent IS NOT NULL THEN
    RAISE EXCEPTION '대댓글의 대댓글은 작성할 수 없습니다. (1depth만 허용)';
  END IF;
  IF parent_story IS DISTINCT FROM NEW.story_id THEN
    RAISE EXCEPTION '부모 댓글과 다른 대상에는 답글을 달 수 없습니다.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_story_comment_parent_trigger ON public.story_comments;
CREATE TRIGGER check_story_comment_parent_trigger
  BEFORE INSERT OR UPDATE ON public.story_comments
  FOR EACH ROW EXECUTE FUNCTION public.check_story_comment_parent();

REVOKE ALL ON FUNCTION public.check_story_comment_parent() FROM PUBLIC;

-- =====================================================
-- 2. story_likes — (사람, 글) 하나에 한 번
-- =====================================================
CREATE TABLE IF NOT EXISTS public.story_likes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, story_id)
);

-- 글별 좋아요 수를 세는 조회용(기본 키는 user_id 가 앞이라 이걸로는 못 센다)
CREATE INDEX IF NOT EXISTS story_likes_story_idx ON public.story_likes (story_id);

-- =====================================================
-- 3. RLS
-- =====================================================
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

-- 읽기: 공개된 글의, 가려지지 않은 댓글만. 비회원(anon)도 읽는다 — /blog 는 누구나 본다.
-- (SELECT is_published …) 의 stories 조회도 stories RLS(공개 글만)를 거친다.
DROP POLICY IF EXISTS "Story comments are viewable on published stories" ON public.story_comments;
CREATE POLICY "Story comments are viewable on published stories"
  ON public.story_comments FOR SELECT
  USING (
    is_hidden = false
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_comments.story_id AND s.is_published
    )
  );

-- 쓰기: 로그인한 본인 명의로, 공개된 글에만. 가린 상태로 쓰는 건 막는다(숨김은 운영자만).
DROP POLICY IF EXISTS "Users can insert own story comments" ON public.story_comments;
CREATE POLICY "Users can insert own story comments"
  ON public.story_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_hidden = false
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_comments.story_id AND s.is_published
    )
  );

-- 고치기: 본인 것만. 다른 글로 옮기거나 스스로 숨김을 풀 수 없게 WITH CHECK 도 같은 조건.
DROP POLICY IF EXISTS "Users can update own story comments" ON public.story_comments;
CREATE POLICY "Users can update own story comments"
  ON public.story_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_hidden = false
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_comments.story_id AND s.is_published
    )
  );

DROP POLICY IF EXISTS "Users can delete own story comments" ON public.story_comments;
CREATE POLICY "Users can delete own story comments"
  ON public.story_comments FOR DELETE USING (auth.uid() = user_id);

-- 좋아요: 개수는 누구나, 누르기·취소는 본인만(공개 글에만 누른다)
DROP POLICY IF EXISTS "Anyone can view story likes" ON public.story_likes;
CREATE POLICY "Anyone can view story likes"
  ON public.story_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like published stories" ON public.story_likes;
CREATE POLICY "Users can like published stories"
  ON public.story_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_likes.story_id AND s.is_published
    )
  );

DROP POLICY IF EXISTS "Users can remove own story likes" ON public.story_likes;
CREATE POLICY "Users can remove own story likes"
  ON public.story_likes FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_comments TO authenticated;
GRANT SELECT                        ON public.story_comments TO anon;
GRANT SELECT, INSERT, DELETE        ON public.story_likes    TO authenticated;
GRANT SELECT                        ON public.story_likes    TO anon;

-- =====================================================
-- 4. 신고 — 책 이야기 댓글도 받는다
-- =====================================================
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS story_comment_id uuid
    REFERENCES public.story_comments(id) ON DELETE CASCADE;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_one_target;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_one_target
  CHECK (num_nonnulls(comment_id, story_comment_id) = 1);

-- 같은 사람이 같은 댓글을 여러 번 신고해도 한 건(book_comments 쪽과 같은 규칙)
CREATE UNIQUE INDEX IF NOT EXISTS reports_reporter_story_comment_key
  ON public.reports (reporter_id, story_comment_id)
  WHERE story_comment_id IS NOT NULL;

-- 신고 넣기: 볼 수 있는 남의 댓글만 — 책 댓글 또는 책 이야기 댓글
DROP POLICY IF EXISTS "Users can report visible comments" ON public.reports;
CREATE POLICY "Users can report visible comments"
  ON public.reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND (
      EXISTS (
        SELECT 1 FROM public.book_comments c
        WHERE c.id = reports.comment_id
          AND c.user_id IS DISTINCT FROM auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.story_comments c
        WHERE c.id = reports.story_comment_id
          AND c.user_id IS DISTINCT FROM auth.uid()
      )
    )
  );

-- =====================================================
-- 5. 체험 계정 쓰기 차단 — 새 사용자 기록 표에도(app/demo-db-triggers.test.ts 가 지킨다)
-- =====================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY array['story_comments', 'story_likes']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS zz_block_demo_writes ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER zz_block_demo_writes
         BEFORE INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH STATEMENT EXECUTE FUNCTION public.block_demo_writes()',
      t
    );
  END LOOP;
END;
$$;
