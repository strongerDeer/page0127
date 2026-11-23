-- 서재 검색엔진 노출 스위치 (2026-11-23, HJ C안: 기본 켜짐)
--
-- 블로그처럼 공개 서재는 기본으로 검색엔진에 노출하고, 원하지 않는 사람만 끈다.
-- 끄면: 서재(/{username})와 하위 페이지에 robots noindex, sitemap 에서 제외.
-- 서비스 안의 공개 범위(링크로 들어온 사람이 보는 것)는 바뀌지 않는다 — 검색 결과에만 안 나온다.
--
-- 왜 끌 수 있어야 하나: 가입 시 닉네임 기본값이 구글 이름이라, 실명 검색에 독서 기록이
-- 같이 뜰 수 있다. 피할 방법은 있어야 한다.

alter table public.profiles
  add column if not exists search_indexable boolean not null default true;

-- 공개 칸 목록(PROFILE_PUBLIC_COLUMNS)에 들어간다 — 서재 메타데이터·sitemap 이 읽는다.
-- profiles 는 컬럼 단위 SELECT 권한이라(20261001000000) 새 칸은 따로 열어 줘야 한다.
grant select (search_indexable) on public.profiles to anon, authenticated;
