-- ============================================================
-- 도서 랭킹 함수를 "공개 기록만" 세도록 고친다.
--
-- 왜:
--   books SELECT 정책은 `is_public = true OR auth.uid() = user_id` 다.
--   RLS 는 익명 방문자만 걸러주고, SECURITY DEFINER 함수는 RLS 자체를 우회한다.
--   그래서 랭킹의 "N명이 완독"은 비공개 기록까지 전수로 세는데,
--   책 정보 페이지의 같은 문구는 공개 기록만 센다 (is_public 을 명시했다).
--   같은 책이 홈에서는 12, 책 페이지에서는 8 로 보였다.
--   → 여러 사용자를 걸치는 집계는 반드시 is_public 을 직접 걸어야 한다.
--
-- 어떻게:
--   기존 정의를 그대로 옮기고 `AND b.is_public = true` 만 더한다.
--   CREATE OR REPLACE 는 함수 oid 를 유지하므로 소유자·권한(ACL)·COMMENT 가 보존된다.
--   시그니처(인자 이름·타입·기본값, 반환 컬럼, 휘발성, SECURITY, search_path)를
--   한 글자도 바꾸지 않는다 — 다르면 REPLACE 가 아니라 오버로드가 만들어진다.
--
-- 범위 주의:
--   스냅샷(snapshot_book_rankings)과 조회(get_book_ranking_with_delta)는
--   **함께** 고쳐야 한다. 한쪽만 모집단을 좁히면 저장된 과거 순위와
--   현재 순위가 다른 모집단에서 나와 순위 변동(▲/▼)이 거짓이 된다.
-- ============================================================


-- ── 1. 인생책 랭킹 (20240630000001_create_ranking_functions.sql) ──
-- SECURITY INVOKER(기본) 이지만 로그인 사용자에게는 RLS 가 자기 비공개 기록을
-- 통과시키므로 여기서도 명시가 필요하다.

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
      AND b.is_public = true
    GROUP BY b.isbn, gb.id
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$;


-- ── 2. 완독왕 랭킹 (같은 파일) ──
-- 랭킹 조회 함수의 폴백 경로(BookRankingSection)와 랜딩 히어로가 쓴다.
-- 여기를 빼면 기본 경로와 폴백 경로의 숫자가 달라진다.

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
      AND b.is_public = true
    GROUP BY b.isbn, gb.id
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$;


-- ── 3. 일별 스냅샷 (20260713_create_ranking_snapshots.sql) ──
-- SECURITY DEFINER → RLS 를 우회하므로 필터가 없으면 전수를 센다.

CREATE OR REPLACE FUNCTION public.snapshot_book_rankings(
    target_date DATE DEFAULT CURRENT_DATE,
    top_n       INT  DEFAULT 50
)
RETURNS TABLE (snapshot_rank_type TEXT, rows_written BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- plpgsql은 RETURNS TABLE 의 출력 이름을 '변수'로 취급한다.
-- 그 이름이 테이블 컬럼과 겹치면 INSERT 컬럼 리스트·ON CONFLICT 에서
-- "column reference is ambiguous"로 터진다.
-- → 출력 이름을 snapshot_rank_type 으로 피하고, 충돌 시 컬럼을 우선한다.
#variable_conflict use_column
DECLARE
    best_written BIGINT;
    most_written BIGINT;
BEGIN
    -- 인생책 (10점을 준 사람이 가장 많은 책)
    WITH ranked AS (
        SELECT
            b.isbn,
            COUNT(*) AS cnt,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, b.isbn ASC) AS rn
        FROM public.books b
        JOIN public.global_books gb ON b.isbn = gb.isbn
        WHERE b.rating = 10
          AND b.is_public = true
        GROUP BY b.isbn
        ORDER BY cnt DESC, b.isbn ASC
        LIMIT top_n
    ),
    upserted AS (
        INSERT INTO public.book_ranking_snapshots
            (snapshot_date, rank_type, isbn, rank, count)
        SELECT target_date, 'best', r.isbn, r.rn::INT, r.cnt
        FROM ranked r
        ON CONFLICT (snapshot_date, rank_type, isbn)
        DO UPDATE SET rank = EXCLUDED.rank, count = EXCLUDED.count
        RETURNING 1
    )
    SELECT COUNT(*) INTO best_written FROM upserted;

    -- 완독왕 (가장 많이 완독한 책)
    WITH ranked AS (
        SELECT
            b.isbn,
            COUNT(*) AS cnt,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, b.isbn ASC) AS rn
        FROM public.books b
        JOIN public.global_books gb ON b.isbn = gb.isbn
        WHERE b.status = 'completed'
          AND b.is_public = true
        GROUP BY b.isbn
        ORDER BY cnt DESC, b.isbn ASC
        LIMIT top_n
    ),
    upserted AS (
        INSERT INTO public.book_ranking_snapshots
            (snapshot_date, rank_type, isbn, rank, count)
        SELECT target_date, 'most', r.isbn, r.rn::INT, r.cnt
        FROM ranked r
        ON CONFLICT (snapshot_date, rank_type, isbn)
        DO UPDATE SET rank = EXCLUDED.rank, count = EXCLUDED.count
        RETURNING 1
    )
    SELECT COUNT(*) INTO most_written FROM upserted;

    RETURN QUERY
        SELECT 'best'::TEXT, best_written
        UNION ALL
        SELECT 'most'::TEXT, most_written;
END;
$$;


-- ── 4. 순위 변동 포함 조회 (같은 파일) ──
-- 화면에 실제로 보이는 "N명이 완독" 숫자를 만드는 함수다.
-- 주의: 기존 WHERE 는 rank_type 별 OR 분기다. AND 가 OR 보다 먼저 묶이므로
--       is_public 조건은 OR 분기 전체를 괄호로 감싼 뒤 AND 로 걸어야 한다.

CREATE OR REPLACE FUNCTION public.get_book_ranking_with_delta(
    rank_type_param TEXT,
    limit_count     INT DEFAULT 10
)
RETURNS TABLE (
    isbn        TEXT,
    count       BIGINT,
    book_info   JSONB,
    rank        INTEGER,
    prev_rank   INTEGER,
    rank_delta  INTEGER,   -- 양수 = 상승. has_history=false 또는 신규면 NULL
    is_new      BOOLEAN,   -- 직전 스냅샷에는 없던 책
    has_history BOOLEAN    -- 비교할 과거 스냅샷이 존재하는가
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
-- 출력 이름(isbn·count·rank…)이 테이블 컬럼과 겹친다 → 충돌 시 컬럼을 우선한다.
-- (아래 쿼리는 모든 컬럼을 c./p. 로 한정했지만, 이중 안전장치로 둔다)
#variable_conflict use_column
DECLARE
    prev_date DATE;
BEGIN
    IF rank_type_param NOT IN ('best', 'most') THEN
        RAISE EXCEPTION 'rank_type_param must be best or most, got %', rank_type_param;
    END IF;

    -- 비교 기준: 오늘 이전의 가장 최근 스냅샷
    SELECT MAX(s.snapshot_date) INTO prev_date
    FROM public.book_ranking_snapshots s
    WHERE s.rank_type = rank_type_param
      AND s.snapshot_date < CURRENT_DATE;

    RETURN QUERY
    WITH current_ranking AS (
        SELECT
            b.isbn AS c_isbn,
            COUNT(*) AS c_count,
            to_jsonb(gb.*) AS c_book_info,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, b.isbn ASC)::INT AS c_rank
        FROM public.books b
        JOIN public.global_books gb ON b.isbn = gb.isbn
        WHERE b.is_public = true
          AND ((rank_type_param = 'best' AND b.rating = 10)
            OR (rank_type_param = 'most' AND b.status = 'completed'))
        GROUP BY b.isbn, gb.id
        ORDER BY c_count DESC, b.isbn ASC
        LIMIT limit_count
    )
    SELECT
        c.c_isbn,
        c.c_count,
        c.c_book_info,
        c.c_rank,
        p.rank AS p_rank,
        -- 이전 순위 - 현재 순위 → 양수면 순위가 올라간 것
        CASE
            WHEN prev_date IS NULL OR p.rank IS NULL THEN NULL
            ELSE p.rank - c.c_rank
        END::INT,
        -- 과거 스냅샷은 있는데 이 책이 없었다 → 신규 진입
        (prev_date IS NOT NULL AND p.rank IS NULL) AS c_is_new,
        (prev_date IS NOT NULL) AS c_has_history
    FROM current_ranking c
    LEFT JOIN public.book_ranking_snapshots p
           ON p.isbn = c.c_isbn
          AND p.rank_type = rank_type_param
          AND p.snapshot_date = prev_date
    ORDER BY c.c_rank;
END;
$$;


-- ── 5. 권한 재확인 ────────────────────────────────────────────
-- CREATE OR REPLACE 는 ACL 을 유지하므로 아래는 상태 변화가 없는 재확인이다.
-- 20260725000001_lock_down_function_privileges.sql 의 allowlist 와 정확히 같다
-- (그 마이그레이션이 스키마 기본 권한을 닫아 뒀기 때문에 명시적으로 남겨 둔다).
GRANT EXECUTE ON FUNCTION public.get_books_of_life(integer)
    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_most_read_books(integer)
    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_book_ranking_with_delta(text, integer)
    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_book_rankings(date, integer)
    TO service_role;
