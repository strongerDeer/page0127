-- 책 단위 댓글 재설계 ① 테이블
--
-- 배경: 댓글이 활동(activity) 단위로 저장되어 같은 책에 대한 대화가 활동 개수만큼
-- 갈라졌다. 대상을 책으로 옮긴다. 개인 서재 책(books)과 전역 책(global_books) 두
-- 종류를 한 테이블에서 다루되, CHECK로 정확히 하나만 채워지게 강제한다.
--
-- 트리거(1depth 제한, 부모-대상 일치)는 여기서 만들지 않는다. 다음 마이그레이션의
-- 이관 INSERT를 방해하기 때문이다. 자세한 이유는 20260725000004 주석 참고.
--
-- 작성일: 2026-07-25

CREATE TABLE IF NOT EXISTS public.book_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id        UUID REFERENCES public.books(id)        ON DELETE CASCADE,
  global_book_id UUID REFERENCES public.global_books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_comment_id UUID REFERENCES public.book_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  -- num_nonnulls: 인자 중 NULL이 아닌 개수. 정확히 하나만 채워져야 한다.
  CONSTRAINT book_comments_one_target CHECK (num_nonnulls(book_id, global_book_id) = 1)
);

CREATE INDEX IF NOT EXISTS idx_book_comments_book_id        ON public.book_comments(book_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_global_book_id ON public.book_comments(global_book_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_parent_id      ON public.book_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_created_at     ON public.book_comments(created_at);

-- 이름 주의: book_likes는 이미 전역 책(global_books) 좋아요로 점유되어 있다
--            (/books/all, /api/books/like). 개인 서재 책은 book_record_likes.
CREATE TABLE IF NOT EXISTS public.book_record_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.book_thread_reads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, book_id)
);

-- updated_at 자동 갱신 (기존 함수 재사용)
DROP TRIGGER IF EXISTS update_book_comments_updated_at ON public.book_comments;
CREATE TRIGGER update_book_comments_updated_at
  BEFORE UPDATE ON public.book_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.book_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_record_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_thread_reads ENABLE ROW LEVEL SECURITY;

-- 조회: 전역 책 댓글은 누구나. 개인 책 댓글은 "그 책 행이 보이는 사람"만.
--
-- 범위를 books SELECT 정책(20260723000001: 공개 책 또는 본인)과 정확히 맞춘다.
-- activity_comments 정책(20260725000000)에는 팔로워 분기가 있지만, books 행 자체는
-- 팔로워에게 보이지 않는다. 댓글만 팔로워에게 열면 "책 정보는 안 보이는데 댓글은
-- 보이는" 어긋난 상태가 되므로, 더 좁은 쪽(책 행 가시성)에 맞춘다.
DROP POLICY IF EXISTS "Book comments are viewable by allowed viewers" ON public.book_comments;
CREATE POLICY "Book comments are viewable by allowed viewers"
  ON public.book_comments FOR SELECT
  USING (
    global_book_id IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = book_comments.book_id
        AND (b.is_public = true OR b.user_id = auth.uid())
    )
  );

-- 작성: 본인 명의로만, 그리고 볼 수 있는 대상에만
DROP POLICY IF EXISTS "Users can insert own book comments" ON public.book_comments;
CREATE POLICY "Users can insert own book comments"
  ON public.book_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      global_book_id IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM public.books b
        WHERE b.id = book_comments.book_id
          AND (b.is_public = true OR b.user_id = auth.uid())
      )
    )
  );

-- Postgres는 UPDATE 새 행에도 테이블 SELECT 정책의 USING을 항상 강제한다
-- (이 정책의 WITH CHECK 유무와 무관) — 지금 SELECT 정책("공개 또는 본인")
-- 하에서는 이것 없이도 대상 재지정이 막힌다(현재는 중복 방어). INSERT 정책과
-- 대칭을 맞추고, SELECT 정책이 나중에 느슨해지면(예: 팔로워 분기) 그때부터
-- 이 절이 대상 재지정을 막는 실제 방어선이 되도록 명시해둔다.
DROP POLICY IF EXISTS "Users can update own book comments" ON public.book_comments;
CREATE POLICY "Users can update own book comments"
  ON public.book_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      global_book_id IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM public.books b
        WHERE b.id = book_comments.book_id
          AND (b.is_public = true OR b.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own book comments" ON public.book_comments;
CREATE POLICY "Users can delete own book comments"
  ON public.book_comments FOR DELETE USING (auth.uid() = user_id);

-- 좋아요: 집계는 공개, 쓰기는 본인 행만
DROP POLICY IF EXISTS "Anyone can view book record likes" ON public.book_record_likes;
CREATE POLICY "Anyone can view book record likes"
  ON public.book_record_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own book record likes" ON public.book_record_likes;
CREATE POLICY "Users can insert own book record likes"
  ON public.book_record_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own book record likes" ON public.book_record_likes;
CREATE POLICY "Users can delete own book record likes"
  ON public.book_record_likes FOR DELETE USING (auth.uid() = user_id);

-- 열람 시각: 남의 열람 시각을 볼 이유가 없다 → SELECT도 본인 행만
DROP POLICY IF EXISTS "Users manage own thread reads" ON public.book_thread_reads;
CREATE POLICY "Users manage own thread reads"
  ON public.book_thread_reads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 20260724000000_grant_public_privileges.sql 과 같은 방침: RLS가 행을 거르고,
-- 테이블 권한은 역할에 명시적으로 부여한다.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_comments     TO authenticated;
GRANT SELECT                        ON public.book_comments     TO anon;
GRANT SELECT, INSERT, DELETE        ON public.book_record_likes TO authenticated;
GRANT SELECT                        ON public.book_record_likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_thread_reads TO authenticated;
