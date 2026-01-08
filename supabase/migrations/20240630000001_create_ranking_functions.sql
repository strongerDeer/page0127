-- Function to get "Books of Life" (Most 10-point ratings)
CREATE OR REPLACE FUNCTION public.get_books_of_life(limit_count int DEFAULT 10)
RETURNS TABLE (
    isbn TEXT,
    count BIGINT,
    book_info JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.isbn,
        COUNT(*) as count,
        to_jsonb(gb.*) as book_info
    FROM public.books b
    JOIN public.global_books gb ON b.isbn = gb.isbn
    WHERE b.rating = 10
    GROUP BY b.isbn, gb.id
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$;

-- Function to get "Most Completed Books" (Most registered/read)
-- Interpreting "Most registered by users" as count of records
CREATE OR REPLACE FUNCTION public.get_most_read_books(limit_count int DEFAULT 10)
RETURNS TABLE (
    isbn TEXT,
    count BIGINT,
    book_info JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.isbn,
        COUNT(*) as count,
        to_jsonb(gb.*) as book_info
    FROM public.books b
    JOIN public.global_books gb ON b.isbn = gb.isbn
    WHERE b.status = 'completed' -- filtering for "completed" books as per name
    GROUP BY b.isbn, gb.id
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$;
