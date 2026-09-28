-- 도서 공급자 전환(알라딘 → YES24)을 위한 스키마 준비.
--
-- 배경: 알라딘 OpenAPI 가 2026-10-30 에 종료된다(신규 인증키 발급은 2026-09-04 로 이미 마감).
-- 그날로 도서 검색과 상세 조회가 끊기므로 공급자를 YES24 Open API 로 교체한다.
--
-- 설계 전제는 "공급자는 앞으로도 또 바뀐다" 이다. 알라딘은 15년 만에, 네이버 책 검색은
-- 2026-07-31 에 문을 닫았다. 그래서 공급자 이름을 행에 기록해 두고(`source`), 공급자가
-- 사라져도 남는 것(상품번호·우리 Storage 의 이미지)을 따로 확보한다.
--
--   source          — 이 행의 메타데이터가 어느 공급자에서 왔는지
--   provider_item_id   — YES24 상품번호. 이미지 URL 을 API 없이 조립하는 열쇠
--   back_image      — YES24 는 알라딘에 없던 뒷표지를 제공한다
--   cover_synced_at — 이미지를 우리 Storage 로 옮긴 시각. 백필 재실행의 기준점
--
-- provider_item_id 가 왜 자산인가: 이미지 URL 이
-- `https://image.yes24.com/goods/{itemId}/XL` 처럼 **ISBN 이 아니라 상품번호**로 만들어진다.
-- ISBN → 상품번호 매핑은 API 로만 얻을 수 있지만, 한 번 받아 두면 영구히 유효하다.
-- 그래서 상품번호만 확보해 두면 YES24 API 가 훗날 종료돼도 이미지는 계속 쓸 수 있다.

alter table public.global_books
  add column if not exists provider_item_id text,
  add column if not exists back_image text,
  add column if not exists cover_synced_at timestamptz,
  add column if not exists sub_title text,
  add column if not exists width_mm smallint,
  add column if not exists height_mm smallint,
  add column if not exists thickness_mm smallint,
  add column if not exists source text not null default 'aladin';

-- 부제·출처는 사용자별 책에도 함께 저장한다. 책 상세·목록이 books 를 직접 읽기 때문에,
-- global_books 에만 두면 화면마다 조인을 새로 붙여야 한다.
--
-- 출처를 화면까지 들고 가야 하는 이유는 약관이다 — YES24 이용약관은 도서가 노출되는
-- 화면에 **출처 표기와 상품 상세페이지 링크**를 함께 제공할 것을 의무로 둔다.
-- 상품 상세페이지 주소는 상품번호로만 만들 수 있어서 provider_item_id 가 필요하다.
alter table public.books
  add column if not exists sub_title text,
  add column if not exists provider_item_id text,
  add column if not exists source text;

comment on column public.books.source is
  '이 행의 도서정보 출처 공급자. 출처 표기 UI 가 어느 서점을 적을지 정한다. 옛 행은 NULL 이다.';
comment on column public.books.provider_item_id is
  '공급자 상품번호. 상품 상세페이지 링크(약관상 의무)를 만드는 데 쓴다.';

comment on column public.global_books.provider_item_id is
  'YES24 상품번호(itemId). 이미지 URL(image.yes24.com/goods/{itemId}/...) 조립에 쓴다. ISBN 과 다르다.';
comment on column public.global_books.back_image is
  '뒷표지 이미지 URL. YES24 만 제공한다(알라딘에는 없어 기존 행은 전부 NULL).';
comment on column public.global_books.cover_synced_at is
  '표지·책등·뒷표지를 book-covers 버킷으로 옮긴 시각. NULL 이면 아직 외부 CDN 을 직접 참조 중.';
comment on column public.global_books.sub_title is
  '부제. 알라딘은 제목에 " - 부제"를 붙여 줬지만 YES24는 따로 준다. 기존 행은 NULL 이다.';
-- ⚠️ YES24 응답의 필드 이름과 우리 컬럼이 어긋난다. 옮길 때 반드시 확인할 것:
--   YES24 width(153)  → width_mm      판형 가로
--   YES24 length(224) → height_mm     판형 세로
--   YES24 height(20)  → thickness_mm  **책등 두께**  ← 이름이 가장 헷갈리는 자리
comment on column public.global_books.width_mm is '판형 가로(mm). YES24 width.';
comment on column public.global_books.height_mm is '판형 세로(mm). YES24 length.';
comment on column public.global_books.thickness_mm is
  '책등 두께(mm). YES24 height. 책장 UI에서 책등 폭을 실물 비례로 그리는 데 쓴다.';

comment on column public.global_books.source is
  '이 행의 메타데이터 출처 공급자. 공급자 교체 시 어느 행을 다시 채워야 하는지 구분한다.';

-- 기존 행은 전부 알라딘에서 왔으므로 default 'aladin' 이 곧 사실이다.
-- 오타가 조용히 통과하지 않도록 값을 제약으로 묶는다 — 매직 문자열을 그냥 두면
-- 나중에 'Yes24' 같은 변형이 섞여도 에러 없이 조회 결과만 0 건이 된다.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'global_books_source_check'
  ) then
    alter table public.global_books
      add constraint global_books_source_check
      check (source in ('aladin', 'yes24', 'manual'));
  end if;
end $$;

-- 백필이 "아직 상품번호를 못 받은 책"을 반복해서 찾는다. 부분 인덱스라 백필이
-- 끝나면 사실상 비어 저렴해진다.
create index if not exists idx_global_books_backfill_pending
  on public.global_books (isbn)
  where provider_item_id is null;

-- 표지 이미지를 우리 Storage 로 옮기기 위한 버킷.
--
-- 외부 CDN 직접 참조(핫링크)는 공급자가 차단하면 전 사용자의 책장이 동시에 깨진다.
-- 알라딘 공지에는 이미지에 대한 언급이 한 줄도 없어 보장이 없는 상태다.
--
-- 쓰기 정책을 일부러 만들지 않는다 — 이 버킷에 넣는 주체는 백필 스크립트뿐이고,
-- service_role 은 RLS 를 우회하므로 정책이 없어야 오히려 일반 사용자의 업로드가 막힌다.
-- 20260728000004_create_profiles_storage_bucket.sql 과 같은 이유로 전부 idempotent 하다.
insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

do $$
begin
  -- 조회: 비로그인 방문자도 공개 서재의 표지를 봐야 하므로 익명에게도 연다.
  -- 정책 이름이 버킷마다 겹치면 안 되므로 'Public Access'(profiles 용)와 구분한다.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public read for book covers'
  ) then
    create policy "Public read for book covers" on storage.objects
      for select using (bucket_id = 'book-covers');
  end if;
end $$;
