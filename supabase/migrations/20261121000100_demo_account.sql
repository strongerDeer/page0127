-- 리뷰어용 체험(데모) 계정 (2026-11-21)
--
-- 이력서·포트폴리오를 보는 사람이 가입 없이 기록·통계·AI 취향 분석 화면을 보도록
-- 공용 체험 계정 하나를 둔다. 체험 계정은 "읽기만" 된다.
--
-- 체험 계정을 가르는 표시는 두 곳에 있다. 둘 다 service_role 만 바꿀 수 있다.
--   1. auth.users.raw_app_meta_data.demo = true
--      → JWT 의 app_metadata 에 실린다. 요청마다 DB 조회 없이 "지금 요청이 체험 계정인가"를
--        알 수 있어 proxy(앱)와 아래 쓰기 차단 트리거가 쓴다.
--   2. profiles.is_demo = true
--      → "남의 화면"에서 체험 계정을 거를 때 쓴다(랭킹·검색·사이트맵). 다른 사람의 JWT 에는
--        체험 계정의 app_metadata 가 없으므로 테이블 컬럼이 필요하다.
--
-- 막는 겹(심층 방어):
--   UI 안내 → proxy 가 /api 쓰기 403 → 서버 액션 첫 줄 확인 → 이 파일의 DB 트리거.
--   브라우저에는 anon 키와 체험 계정 JWT 가 있어서 앱을 거치지 않고 PostgREST 를 직접
--   부를 수도 있다. 마지막 겹이 DB 에 있어야 그 경로도 막힌다.

-- ─── 1. profiles.is_demo ────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_demo boolean not null default false;

comment on column public.profiles.is_demo is
  '리뷰어용 체험 계정. 공개 목록(랭킹·검색·사이트맵)에서 빠진다. service_role 만 바꿀 수 있다.';

-- profiles 는 열 단위로 SELECT 를 준다(20261001000000, 이메일 보호). 검색·사이트맵이
-- 사용자 클라이언트로 is_demo 를 걸러야 하므로 이 열도 읽게 한다(민감한 값이 아니다).
grant select (is_demo) on public.profiles to anon, authenticated;

-- 체험 계정은 한두 개뿐이라 부분 인덱스로 충분하다
create index if not exists profiles_is_demo_idx
  on public.profiles (id) where is_demo;

-- 사용자가 자기 프로필을 고칠 때 is_demo 를 켜고 끄지 못하게 한다.
-- (켜면 랭킹에서 스스로 빠지고, 끄면 체험 계정이 공개 목록에 섞인다)
-- status·suspended_until 을 지키던 기존 트리거 함수에 한 줄 더한다.
create or replace function public.protect_profile_moderation_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.status := 'active';
      new.suspended_until := null;
      new.is_demo := false;
    else
      new.status := old.status;
      new.suspended_until := old.suspended_until;
      new.is_demo := old.is_demo;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_moderation_columns() from public, anon, authenticated;

-- ─── 2. 지금 요청이 체험 계정인가 ────────────────────────────────────────
-- PostgREST 는 요청의 JWT claims 를 request.jwt.claims 설정으로 넘긴다.
-- SECURITY DEFINER 함수 안에서도 이 값은 그대로라, RLS 를 건너뛰는 RPC 안의 쓰기도 잡힌다.
-- service_role·크론·마이그레이션(값이 없거나 demo 가 없음)은 false.
create or replace function public.is_demo_request()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb
      -> 'app_metadata' ->> 'demo')::boolean,
    false
  );
$$;

grant execute on function public.is_demo_request() to anon, authenticated, service_role;

-- ─── 3. 체험 계정의 쓰기를 DB 에서 막는다 ────────────────────────────────
-- FOR EACH STATEMENT: 행마다가 아니라 문장마다 한 번 확인한다(일반 사용자 비용이 거의 없다).
-- errcode 42501(insufficient_privilege) → PostgREST 는 403 으로 돌려준다.
create or replace function public.block_demo_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_demo_request() then
    raise exception using
      errcode = '42501',
      message = 'demo_read_only',
      hint = '체험 계정은 저장되지 않아요.';
  end if;
  return null;
end;
$$;

revoke execute on function public.block_demo_writes() from public, anon, authenticated;

-- 사용자 기록이 남는 테이블만 막는다. 일부러 뺀 것:
--   rate_limits(레이트 리밋 카운터), user_daily_visits·quality_rum_samples·admin_events(방문·성능 기록),
--   sentence_draws(오늘의 문장 뽑기 — 체험에서도 보여 주고 싶은 기능), book_thread_reads(읽음 표시),
--   global_books·daily_sentences·hero_slides 등 운영·카탈로그 테이블(서버가 service_role 로 쓴다).
-- ⚠️ 사용자 기록 테이블을 새로 만들면 이 목록에도 트리거를 붙인다.
do $$
declare
  t text;
begin
  foreach t in array array[
    'account_deletions', 'activities', 'ai_usage_logs', 'book_comments',
    'book_likes', 'book_memos', 'book_quotes', 'book_recommendations',
    'book_record_likes', 'books', 'bulk_operation_receipts',
    'compatibility_analyses', 'follows', 'mutual_recommendations',
    'notifications', 'profiles', 'push_subscriptions', 'reading_envelopes',
    'reading_nudge_limits', 'reading_nudge_settings', 'reports', 'taste_analyses'
  ]
  loop
    execute format('drop trigger if exists zz_block_demo_writes on public.%I', t);
    execute format(
      'create trigger zz_block_demo_writes
         before insert or update or delete on public.%I
         for each statement execute function public.block_demo_writes()',
      t
    );
  end loop;
end $$;

-- ─── 4. 남의 화면에서 체험 계정의 책을 숨긴다 ─────────────────────────────
-- 체험 계정이 책 18권을 담으면 랭킹·"이 책을 읽은 리더 N명"에 +1 씩 섞인다.
-- 체험 계정의 책은 체험 계정 자신에게만 보이게 하는 RESTRICTIVE 정책 하나로 거른다.
-- (PERMISSIVE 정책들과 AND 로 묶인다 → 기존 공개 규칙은 그대로 두고 조건만 더한다)
-- 체험 계정 id 목록. profiles 는 열 단위 권한이라(이메일 보호) anon·authenticated 가
-- 정책 안에서 직접 읽지 못한다 → SECURITY DEFINER 로 id 만 꺼내 준다.
create or replace function public.demo_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p where p.is_demo;
$$;

revoke execute on function public.demo_user_ids() from public;
grant execute on function public.demo_user_ids() to anon, authenticated, service_role;

drop policy if exists "Demo books are visible only to the demo account" on public.books;
-- array(select ...) 는 바깥 행과 상관없는 서브쿼리라 initplan 이 된다 → 행마다가 아니라 쿼리마다 한 번 계산
create policy "Demo books are visible only to the demo account"
  on public.books
  as restrictive
  for select
  to anon, authenticated
  using (
    user_id = (select auth.uid())
    or user_id <> all (array(select public.demo_user_ids()))
  );

-- RLS 를 건너뛰는 SECURITY DEFINER 랭킹 함수 두 개는 직접 거른다.
-- (본문은 20260728000005 와 같고 체험 계정 조건 한 줄만 더했다)
CREATE OR REPLACE FUNCTION public.snapshot_book_rankings(
    target_date DATE DEFAULT CURRENT_DATE,
    top_n       INT  DEFAULT 50
)
RETURNS TABLE (snapshot_rank_type TEXT, rows_written BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    best_written BIGINT;
    most_written BIGINT;
BEGIN
    WITH ranked AS (
        SELECT
            b.isbn,
            COUNT(*) AS cnt,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, b.isbn ASC) AS rn
        FROM public.books b
        JOIN public.global_books gb ON b.isbn = gb.isbn
        WHERE b.is_life_book = true
          AND b.is_public = true
          AND b.user_id <> ALL (ARRAY(SELECT public.demo_user_ids()))
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

    WITH ranked AS (
        SELECT
            b.isbn,
            COUNT(*) AS cnt,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, b.isbn ASC) AS rn
        FROM public.books b
        JOIN public.global_books gb ON b.isbn = gb.isbn
        WHERE b.status = 'completed'
          AND b.is_public = true
          AND b.user_id <> ALL (ARRAY(SELECT public.demo_user_ids()))
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
    rank_delta  INTEGER,
    is_new      BOOLEAN,
    has_history BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    prev_date DATE;
BEGIN
    IF rank_type_param NOT IN ('best', 'most') THEN
        RAISE EXCEPTION 'rank_type_param must be best or most, got %', rank_type_param;
    END IF;

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
          AND b.user_id <> ALL (ARRAY(SELECT public.demo_user_ids()))
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
        CASE
            WHEN prev_date IS NULL OR p.rank IS NULL THEN NULL
            ELSE p.rank - c.c_rank
        END::INT,
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
