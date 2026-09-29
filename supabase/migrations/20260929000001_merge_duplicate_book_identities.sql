-- 같은 책이 서로 다른 식별자로 두 번 들어간 것을 합친다.
--
-- 왜 생겼나: `global_books.isbn` 이 ISBN13 컬럼이 아니다. 알라딘 시절 응답의 `isbn`
-- 필드를 그대로 저장해 와서 ISBN10(26권)과 알라딘 K코드(70권)가 섞여 있다.
-- YES24 전환 뒤 신규 등록은 항상 ISBN13 을 쓰므로, K코드로 담겨 있던 책을 누가 다시
-- 담으면 **같은 책이 두 행**이 된다. 등록 시 중복 경고도 안 뜬다(isbn 이 다르니까).
--
-- 2026-09-29 운영 실측 — 이미 3권이 그렇게 갈라져 있었다:
--   모순          8998441012 / 9788998441012   담긴책 1 / 1   랭킹 65 / 58
--   데이터 삽질    K622030506 / 9791169214155   담긴책 0 / 2   랭킹 16 / 107
--   나로 살 결심   K382033063 / 9791141613990   담긴책 1 / 0
-- `모순` 은 한 사람이 2024-10 과 2026-02 에 각각 읽은 같은 책인데 2권으로 세어졌다.
--
-- 판별 기준은 `provider_item_id`(YES24 상품번호)다. 번호가 같으면 같은 상품이다.
-- 정본은 ISBN13 쪽으로 잡는다 — 표준이고, 신규 등록이 전부 그 형태라 앞으로 합류한다.
--
-- 건드리지 않는 것: `book_ranking_snapshots`. 날짜별 순위 기록이라 과거에 갈라져
-- 있던 것이 사실이다. 합산하면 있지도 않았던 과거를 쓰게 된다. 병합 이후의
-- 스냅샷부터 올바르게 쌓인다.
--
-- 댓글·좋아요·활동은 `book_id`(books 행 UUID)로 참조하므로 isbn 을 옮겨도 따라온다.
-- 회독 번호도 손대지 않는다 — `dedupeReadings` 가 read_count 를 '합쳐진 기록 수'로
-- 다시 계산해서, 같은 isbn 의 1회독 두 줄을 알아서 2회독으로 보여준다.
--
-- 중복이 없으면 아무 일도 하지 않는다. 나중에 또 생기면 다시 돌릴 수 있다.

do $$
declare
  grp record;
  ref record;
  canonical_isbn text;
  merged_groups int := 0;
  moved_books int := 0;
begin
  for grp in
    select provider_item_id
    from public.global_books
    where provider_item_id is not null
    group by provider_item_id
    having count(*) > 1
  loop
    -- ISBN13 을 정본으로. 없으면 가장 먼저 만들어진 행을 남긴다.
    select isbn into canonical_isbn
    from public.global_books
    where provider_item_id = grp.provider_item_id
    order by (isbn ~ '^97[89][0-9]{10}$') desc, created_at asc
    limit 1;

    -- 사용자 책의 식별자를 정본으로 옮기고, '책 자체'를 가리키는 값도 맞춘다.
    -- 평점·완독일·리뷰 같은 사용자 기록은 건드리지 않는다.
    update public.books b
    set isbn             = canonical_isbn,
        title            = c.title,
        sub_title        = c.sub_title,
        cover_image      = coalesce(c.cover_image, b.cover_image),
        spine_image      = coalesce(c.spine_image, b.spine_image),
        thickness_mm     = coalesce(c.thickness_mm, b.thickness_mm),
        provider_item_id = c.provider_item_id,
        source           = c.source
    from public.global_books c
    where c.isbn = canonical_isbn
      and b.isbn <> canonical_isbn
      and b.isbn in (
        select isbn from public.global_books
        where provider_item_id = grp.provider_item_id
      );

    get diagnostics moved_books = row_count;

    -- isbn 을 들고 있는 나머지 테이블도 같은 규칙으로 옮긴다
    -- (유니크 제약이 없어 충돌하지 않는다).
    --
    -- ⚠️ 환경마다 스키마가 어긋나 있어 **컬럼 존재를 확인하고** 돈다.
    -- 2026-09-29 실측: 운영 `reading_records` 에는 `book_isbn` 이 있는데 로컬에는
    -- isbn 계열 컬럼이 아예 없다. 확인 없이 쓰면 그 환경에서 전체가 멈춘다.
    for ref in
      select *
      from (values
        ('book_recommendations', 'isbn'),
        ('mutual_recommendations', 'isbn'),
        ('reading_records', 'book_isbn')
      ) as t(tbl, col)
    loop
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = ref.tbl
          and column_name = ref.col
      ) then
        execute format(
          'update public.%I set %I = $1
             where %I <> $1
               and %I in (select isbn from public.global_books
                          where provider_item_id = $2)',
          ref.tbl, ref.col, ref.col, ref.col
        ) using canonical_isbn, grp.provider_item_id;
      end if;
    end loop;

    -- 이제 아무도 가리키지 않는 중복 행을 지운다.
    delete from public.global_books
    where provider_item_id = grp.provider_item_id
      and isbn <> canonical_isbn;

    merged_groups := merged_groups + 1;
    raise notice '병합 % -> % (사용자 책 %행 이동)',
      grp.provider_item_id, canonical_isbn, moved_books;
  end loop;

  raise notice '중복 그룹 %개 병합 완료', merged_groups;
end $$;
