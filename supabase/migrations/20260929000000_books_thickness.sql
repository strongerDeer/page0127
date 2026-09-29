-- 책등을 실물 두께 비례로 그리기 위해 두께를 사용자별 책에도 둔다.
--
-- 지금 책장은 `width: auto; height: 240px` 라서 **책등 폭이 이미지 자체 비율로**
-- 결정된다. 그런데 YES24 책등 이미지의 폭은 실제 두께와 상관이 없다 —
-- 2026-09-29 실측: 피로사회(20mm)는 15x600 이라 6px 로 그려지고,
-- 저소비 생활(17mm)은 48x600 이라 19px 로 그려진다. 더 얇은 책이 더 두껍게 보인다.
--
-- global_books.thickness_mm 에만 두면 책장이 매번 조인을 붙여야 한다.
-- cover_image·spine_image·sub_title·source 와 같은 이유로 여기에도 복제한다.
--
-- 운영 분포(162권): 최소 9 · p10 14 · 중앙 20 · p90 30 · 최대 40 (mm)

alter table public.books
  add column if not exists thickness_mm smallint;

comment on column public.books.thickness_mm is
  '책등 두께(mm). 책장에서 책등 폭을 실물 비례로 그리는 데 쓴다. 공급자가 안 주면 NULL.';

-- 이미 백필로 global_books 에 들어온 값을 사용자별 책으로 옮긴다.
-- 백필을 다시 돌리지 않아도 기존 책장이 바로 두께를 갖게 된다.
update public.books b
set thickness_mm = g.thickness_mm
from public.global_books g
where b.isbn = g.isbn
  and g.thickness_mm is not null
  and b.thickness_mm is null;
