-- Baseline: books / activities / activity_comments / comments / profiles
--
-- 이 4+1개 테이블은 Supabase 대시보드에서 직접 만들어져서 마이그레이션 이력이 없었다.
-- 그래서 로컬에서 `supabase db reset`으로 DB를 처음부터 재현하면 이 테이블들이
-- 존재하지 않는 상태로 시작하게 되고, 뒤따르는 마이그레이션들(예: books에 컬럼 추가)이
-- 전부 실패한다.
--
-- 파일명 타임스탬프를 일부러 가장 오래된 마이그레이션(20240630000000)보다
-- 앞서게(20240101000000) 잡은 이유: Supabase CLI는 마이그레이션을 파일명(=타임스탬프)
-- 순서대로 실행하기 때문에, 이 테이블들을 만드는 파일이 그것들을 참조하는
-- 다른 모든 파일보다 먼저 실행되어야 한다.
--
-- 컬럼/제약조건/정책 내용은 원격(prod) DB의 현재 실제 스키마를 그대로 옮긴 것이다
-- (`supabase db dump --linked --schema public`로 추출).

-- =====================================================
-- 0. 트리거가 참조하는 함수 먼저 생성
--    (CREATE TRIGGER는 대상 함수가 이미 존재해야 하므로 테이블/트리거보다 앞에 둔다)
-- =====================================================

CREATE OR REPLACE FUNCTION check_comment_depth()
RETURNS TRIGGER AS $$
BEGIN
  -- parent_comment_id가 있는 경우 (대댓글)
  IF NEW.parent_comment_id IS NOT NULL THEN
    -- 부모 댓글이 이미 대댓글인지 확인
    IF EXISTS (
      SELECT 1 FROM activity_comments
      WHERE id = NEW.parent_comment_id
      AND parent_comment_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION '대댓글의 대댓글은 작성할 수 없습니다. (1depth만 허용)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. 테이블 생성
--    순서: books(독립) -> activities(books 참조) -> activity_comments/comments(activities 참조)
--    profiles는 auth.users만 참조하므로 독립적
-- =====================================================

CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  isbn TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  cover_image TEXT,
  description TEXT,
  pub_date TEXT,
  category TEXT,
  status TEXT NOT NULL CHECK (status IN ('want_to_read', 'reading', 'completed')),
  start_date DATE,
  completed_date DATE,
  rating INTEGER CHECK (rating IN (0, 1, 2, 3, 4, 5, 10)),
  one_line_review TEXT,
  personal_memo TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  page_count INTEGER,
  is_public BOOLEAN NOT NULL DEFAULT true,
  toc TEXT,
  spine_image TEXT,
  read_count INTEGER NOT NULL DEFAULT 1
);

COMMENT ON COLUMN books.is_public IS '책 공개 여부 (true: 공개, false: 비공개)';

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('book_added', 'book_completed', 'review_added')),
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_comment_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT,
  bio TEXT,
  photo_url TEXT,
  reading_goal JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  username TEXT UNIQUE
);

-- =====================================================
-- 2. 인덱스
-- =====================================================

CREATE INDEX IF NOT EXISTS books_isbn_idx ON books(isbn);
CREATE INDEX IF NOT EXISTS books_status_idx ON books(status);
CREATE INDEX IF NOT EXISTS books_user_id_idx ON books(user_id);

CREATE INDEX IF NOT EXISTS idx_activities_book_id ON activities(book_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_created_at ON activity_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_comments_parent_id ON activity_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user_id ON activity_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_activity_id ON comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- =====================================================
-- 3. 트리거
-- =====================================================

CREATE TRIGGER check_comment_depth_trigger
  BEFORE INSERT OR UPDATE ON activity_comments
  FOR EACH ROW EXECUTE FUNCTION check_comment_depth();

CREATE TRIGGER update_activity_comments_updated_at
  BEFORE UPDATE ON activity_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. RLS 활성화 + 정책
-- =====================================================

ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- books
-- 참고: SELECT에 "전체 공개" 정책과 "본인만" 정책이 동시에 있다.
-- Postgres RLS는 같은 동작(SELECT)에 대한 permissive 정책 여러 개를 OR로 합친다.
-- 즉 사실상 "Allow all to view books"(true) 하나가 전체를 이미 허용하고 있다.
CREATE POLICY "Allow all to view books" ON books FOR SELECT USING (true);
CREATE POLICY "Users can view own books" ON books FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own books" ON books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own books" ON books FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own books" ON books FOR DELETE USING (auth.uid() = user_id);

-- activities
-- "팔로우한 사용자의 활동" 조회 정책은 follows 테이블이 필요해서
-- 20251228_zzz_activities_follows_policy.sql (follows 테이블 생성 이후)에서 추가한다.
CREATE POLICY "Users can create their own activities" ON activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own activities" ON activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own activities" ON activities FOR DELETE USING (auth.uid() = user_id);

-- activity_comments
CREATE POLICY "댓글은 모두가 볼 수 있습니다" ON activity_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "로그인한 사용자는 댓글을 작성할 수 있습니다" ON activity_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인의 댓글만 수정할 수 있습니다" ON activity_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인의 댓글만 삭제할 수 있습니다" ON activity_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- comments
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- profiles
-- 아래 SELECT/INSERT/UPDATE 정책 중 일부는 20251228_update_profiles_rls.sql에서
-- DROP POLICY IF EXISTS 후 동일하게 재생성된다 (그 마이그레이션이 이 baseline보다 나중에 실행됨) — 정상.
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = id);
