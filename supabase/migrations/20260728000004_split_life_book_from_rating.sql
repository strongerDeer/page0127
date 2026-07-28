-- 평점에서 "인생책"을 분리한다.
--
-- 문제: books.rating 이 0,1,2,3,4,5,10 을 갖는데 이 값들은 균일한 척도가 아니었다.
--   0  = "평가 안 함" (점수가 아님)
--   10 = "인생책"     (11번째 점수가 아니라 최고점의 별칭)
-- 숫자 칸에 숫자가 아닌 뜻을 끼워 넣은 상태라, 평균을 그대로 내면 인생책 하나가
-- 10점으로 계산되어 왜곡됐다.
--
-- 트랙 A 가 이 왜곡을 앱 코드(entities/book/model/rating.ts)에서 막았고, 그 파일 주석이
-- "나중에 컬럼을 분리할 때 고칠 자리가 한 곳이 되게 한다"고 적었다. 여기가 그 나중이다.
--
-- 왜 지금인가: 데이터가 적을수록 데이터 변형 마이그레이션이 싸고 안전하다.
-- 실사용자 0명인 지금이 가장 싼 시점이다.
--
-- ⚠️ 순서가 중요하다. CHECK 가 10 을 허용하는 동안 백필해야 한다.
--    제약을 먼저 좁히면 백필이 자기 제약에 막힌다.

-- 1) 컬럼 추가 — 기존 행은 전부 false 로 시작한다
alter table public.books
  add column if not exists is_life_book boolean not null default false;

comment on column public.books.is_life_book is
  '인생책 여부. 전에는 rating=10 이라는 매직값이었다(20260728000004에서 분리).';

-- 2) 백필 — 이 시점엔 CHECK 가 아직 10 을 허용한다
do $$
declare
  moved integer;
begin
  update public.books
     set rating = 5, is_life_book = true
   where rating = 10;

  get diagnostics moved = row_count;
  raise notice '인생책 분리: % 건', moved;
end $$;

-- 3) 이제 제약을 좁힌다
--    (이름이 다르면 pg_constraint 로 확인한 실제 이름을 쓴다)
alter table public.books drop constraint if exists books_rating_check;
alter table public.books
  add constraint books_rating_check check (rating in (0, 1, 2, 3, 4, 5));

-- 4) 랭킹 함수가 where 절로 쓰므로 부분 인덱스.
--    전체 인덱스가 아니라 부분 인덱스인 이유: 인생책은 소수라 true 행만 담으면 훨씬 작다.
create index if not exists books_is_life_book_idx
  on public.books (is_life_book) where is_life_book;

-- ── DB 함수: rating = 10 → is_life_book ──
-- 최신 정의가 20260726000000_ranking_functions_public_only.sql 에 있다. 그 파일의
-- 함수 셋을 여기서 재정의한다(옛 파일들은 이미 덮어써진 상태라 건드리지 않는다).
-- is_public = true 조건은 그대로 유지한다 — 트랙 A 가 넣은 공개 범위 조건을 떨어뜨리면
-- 비공개 책이 랭킹에 샌다.

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
    WHERE b.is_life_book = true
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
        WHERE b.is_life_book = true
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
          AND ((rank_type_param = 'best' AND b.is_life_book = true)
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
