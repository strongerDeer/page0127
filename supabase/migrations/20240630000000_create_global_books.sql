-- Create global_books table
CREATE TABLE IF NOT EXISTS public.global_books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    isbn TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    author TEXT,
    publisher TEXT,
    cover_image TEXT,
    description TEXT,
    pub_date TEXT, -- Storing as text to match Aladin API format usually
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.global_books ENABLE ROW LEVEL SECURITY;

-- Call this to allow public read access
CREATE POLICY "Allow public read access" ON public.global_books
    FOR SELECT
    USING (true);

-- Call this to allow authenticated users to insert (we will handle duplicates in logic or via ON CONFLICT)
CREATE POLICY "Allow authenticated insert" ON public.global_books
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create index on ISBN for faster lookups
CREATE INDEX IF NOT EXISTS idx_global_books_isbn ON public.global_books(isbn);

-- Optional: Function to populate global_books from existing books
-- This attempts to insert distinct books from the user 'books' table into 'global_books'
-- books 테이블은 이 마이그레이션보다 나중에 baseline으로 생성되므로,
-- 로컬 재현(db reset) 시 아직 없을 수 있어 IF EXISTS로 감싼다 (운영 DB는 이미 적용 완료된 상태라 영향 없음)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'books') THEN
    INSERT INTO public.global_books (isbn, title, author, publisher, cover_image, description, pub_date, category, created_at)
    SELECT DISTINCT ON (isbn)
        isbn,
        title,
        author,
        publisher,
        cover_image,
        description,
        pub_date,
        category,
        created_at
    FROM public.books
    WHERE isbn IS NOT NULL
    ON CONFLICT (isbn) DO NOTHING;
  END IF;
END $$;
