-- 취향 분석·독서 케미 추천 도서에 YES24 상품번호를 함께 저장한다.
--
-- 배경: 표지는 읽는 쪽에서 `toCoverSource`(entities/book) 로 "YES24 크기별 사본 → Storage
-- 사본" 순으로 고른다. 그러려면 상품번호(provider_item_id)가 필요한데, 추천 두 테이블은
-- 분석 시점에 표지 주소만 복사해 두고 상품번호 컬럼이 없었다. 그래서 이 두 화면만
-- Storage 사본(폭 500px 하나)을 그대로 쓰고 있었다.
--
-- 옛 행은 ISBN 으로 global_books 의 상품번호를 채운다. 상품번호는 영구히 유효하므로
-- 한 번 채워 두면 된다. 못 찾은 행은 NULL 로 남고, 그 행은 지금처럼 저장된 주소를 쓴다.

alter table public.book_recommendations
  add column if not exists provider_item_id text;

alter table public.mutual_recommendations
  add column if not exists provider_item_id text;

comment on column public.book_recommendations.provider_item_id is
  'YES24 상품번호. 표지를 YES24 크기별 사본으로 받는 데 쓴다(toCoverSource).';
comment on column public.mutual_recommendations.provider_item_id is
  'YES24 상품번호. 표지를 YES24 크기별 사본으로 받는 데 쓴다(toCoverSource).';

update public.book_recommendations r
set provider_item_id = g.provider_item_id
from public.global_books g
where r.provider_item_id is null
  and r.isbn is not null
  and g.isbn = r.isbn
  and g.provider_item_id is not null;

update public.mutual_recommendations r
set provider_item_id = g.provider_item_id
from public.global_books g
where r.provider_item_id is null
  and r.isbn is not null
  and g.isbn = r.isbn
  and g.provider_item_id is not null;
