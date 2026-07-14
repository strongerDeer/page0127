-- ============================================================
-- 랭킹 스냅샷 — 순위 변동(▲12 / ▼3 / NEW)을 위한 기반
--
-- 왜 필요한가:
--   교보문고의 "▲448 급상승", 밀리의서재의 "▲12"는 **어제의 랭킹이
--   DB에 남아 있어야만** 계산된다. 즉 이 숫자가 화면에 있다는 것 자체가
--   "누군가 매일 집계를 돌리고 있다"는 증거다.
--   AI가 만든 목업은 이 값을 가질 수 없다. (00_docs/07 §1.3-①)
--
-- 정렬 규칙 (중요):
--   기존 get_books_of_life / get_most_read_books 는 ORDER BY count DESC 뿐이라
--   동점일 때 순서가 매 호출마다 달라질 수 있다. 그러면 delta가 요동친다.
--   → 스냅샷과 조회 모두 (count DESC, isbn ASC) 로 **동일한 tie-break**를 쓴다.
-- ============================================================

-- ── 1. 스냅샷 테이블 ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.book_ranking_snapshots (
    snapshot_date DATE        NOT NULL,
    rank_type     TEXT        NOT NULL CHECK (rank_type IN ('best', 'most')),
    isbn          TEXT        NOT NULL,
    rank          INTEGER     NOT NULL,
    count         BIGINT      NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (snapshot_date, rank_type, isbn)
);

COMMENT ON TABLE public.book_ranking_snapshots IS
    '일별 도서 랭킹 스냅샷. 전일 대비 순위 변동(delta) 계산에 쓴다.';

-- 최근 스냅샷 날짜를 찾는 쿼리가 가장 잦다
CREATE INDEX IF NOT EXISTS book_ranking_snapshots_type_date_idx
    ON public.book_ranking_snapshots (rank_type, snapshot_date DESC);

-- RLS: 누구나 읽을 수 있고(랭킹은 공개 정보), 쓰기는 서버(service_role)만.
-- INSERT/UPDATE 정책을 만들지 않으면 일반 사용자는 쓸 수 없다.
ALTER TABLE public.book_ranking_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "랭킹 스냅샷은 누구나 조회할 수 있다"
    ON public.book_ranking_snapshots;
CREATE POLICY "랭킹 스냅샷은 누구나 조회할 수 있다"
    ON public.book_ranking_snapshots
    FOR SELECT
    USING (true);


-- ── 2. 오늘의 랭킹을 스냅샷으로 기록 ──────────────────────────
--
-- 하루 한 번 호출한다 (Vercel Cron → /api/cron/snapshot-rankings).
-- 같은 날 두 번 돌려도 안전하다 (UPSERT).

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

COMMENT ON FUNCTION public.snapshot_book_rankings IS
    '오늘의 랭킹을 스냅샷 테이블에 기록한다. 하루 한 번 cron으로 호출. 재실행 안전(UPSERT).';


-- ── 3. 순위 변동을 포함한 랭킹 조회 ───────────────────────────
--
-- has_history 가 false면 비교할 과거가 아직 없다는 뜻 →
-- UI는 아무 뱃지도 그리지 않는다. (스냅샷이 없는데 전부 NEW로 칠하면 거짓말이 된다)

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
        WHERE (rank_type_param = 'best' AND b.rating = 10)
           OR (rank_type_param = 'most' AND b.status = 'completed')
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

COMMENT ON FUNCTION public.get_book_ranking_with_delta IS
    '현재 랭킹 + 직전 스냅샷 대비 순위 변동. 스냅샷이 없으면 has_history=false로 알린다.';


-- ── 4. 권한 ───────────────────────────────────────────────────
-- 조회 함수는 비로그인 방문자(anon)도 쓴다 — 랜딩이 공개이므로.
GRANT EXECUTE ON FUNCTION public.get_book_ranking_with_delta(TEXT, INT)
    TO anon, authenticated;

-- 스냅샷 기록은 서버(cron)만. anon/authenticated 에게 주지 않는다.
REVOKE ALL ON FUNCTION public.snapshot_book_rankings(DATE, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.snapshot_book_rankings(DATE, INT) TO service_role;
