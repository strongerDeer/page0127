-- 직접 등록한 책에 표지 사진을 올릴 수 있게 한다.
--
-- 왜: 20261028000000_book_catalog_review.sql 은 "초기 정책"으로 직접 등록 책의 표지를
-- 받지 않았다(트리거가 cover_image 를 항상 NULL 로 지웠다). 그런데 표지가 없으면 서재
-- 책장에서 그 책만 제목 조판으로 남아 눈에 띄고, 사용자는 "이미지 등록이 없네?" 하고
-- 막힌다. 검수(승인 전에는 나에게만 보임)가 이미 있으니 표지도 같은 검수를 거치게 한다.
--
-- 규칙:
-- 1. 사용자는 book-covers 버킷의 manual/{내 uid}/ 폴더에만 올릴 수 있다.
-- 2. 공용 카탈로그(global_books)에 남는 표지 주소는 "그 책을 제출한 사람이 자기 폴더에
--    실제로 올린 파일"일 때만 인정한다. 다른 사람 파일·외부 주소는 트리거가 NULL 로 지운다.
-- 3. 책등·뒷표지는 여전히 받지 않는다.
begin;

-- ── 1. 버킷 업로드 정책 ─────────────────────────────────────────────────
--
-- book-covers 는 원래 백필 스크립트(service_role)만 쓰는 버킷이라 쓰기 정책이 없었다.
-- 직접 등록 표지용 하위 폴더 하나만 연다. 백필 사본 경로({isbn}/cover.jpg)는 그대로 막힌다.
-- 파일 크기·형식 한도는 버킷 전체에 걸리므로 걸지 않는다 — 앱이 올리기 전에 긴 변 1000px
-- WebP 로 줄이고(수십~수백 KB), 아래 경로 규칙이 확장자를 jpg·png·webp 로 묶는다.
drop policy if exists "Users upload own manual book covers" on storage.objects;
create policy "Users upload own manual book covers" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'book-covers'
    and (storage.foldername(name))[1] = 'manual'
    and (storage.foldername(name))[2] = (auth.uid())::text
    and storage.filename(name) ~* '^[0-9a-f-]{36}\.(webp|jpg|png)$'
  );

-- ── 2. 표지 주소 검사 ──────────────────────────────────────────────────
--
-- 주소 모양만 보면 다른 호스트에 같은 경로를 꾸며 넣을 수 있으므로, 실제로 우리
-- 버킷에 그 파일이 있는지까지 본다. storage.objects 는 RLS 가 걸려 있어 security definer.
-- 호스트는 Supabase(운영·dev) 와 로컬(supabase start) 만 받는다. 정확한 프로젝트 주소는
-- DB 가 모르므로 여기까지만 묶고, 화면은 CSP·이미지 설정이 이 환경의 Storage 만 허용한다.
create or replace function public.is_own_manual_cover(p_url text, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_url is not null and p_user is not null and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'book-covers'
      and o.name = substring(
        p_url from '^(?:https://[a-z0-9]+\.supabase\.co|http://(?:127\.0\.0\.1|localhost):54321)/storage/v1/object/public/book-covers/(manual/[0-9a-f-]{36}/[0-9a-f-]{36}\.(?:webp|jpg|png))$'
      )
      and (storage.foldername(o.name))[2] = p_user::text
  );
$$;
revoke all on function public.is_own_manual_cover(text, uuid) from public, anon;
grant execute on function public.is_own_manual_cover(text, uuid) to authenticated, service_role;

-- ── 3. 카탈로그 제출 가드 — 표지만 조건부로 허용 ──────────────────────────
--
-- 20261028000000 의 함수와 같고, manual 분기의 cover_image 처리만 바뀐다.
create or replace function public.guard_catalog_submission()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'UPDATE' and (old.submitted_by is distinct from auth.uid() or old.review_status = 'approved') then
      raise exception '이 도서 정보는 수정할 수 없습니다.' using errcode = '42501';
    end if;
    new.source := 'manual';
    new.provider_item_id := null;
    new.review_status := 'pending';
    new.submitted_by := case when tg_op = 'INSERT' then auth.uid() else old.submitted_by end;
    new.review_note := null; new.reviewed_by := null; new.reviewed_at := null;
    if tg_op = 'UPDATE' then new.isbn := old.isbn; end if;
  end if;
  if new.source = 'manual' then
    -- 제출자가 자기 폴더에 올린 표지만 남긴다. 책등·뒷표지는 받지 않는다.
    if not public.is_own_manual_cover(new.cover_image, new.submitted_by) then
      new.cover_image := null;
    end if;
    new.spine_image := null; new.back_image := null;
    new.provider_item_id := null;
  end if;
  new.review_version := case when tg_op = 'INSERT' then 1 else old.review_version + 1 end;
  return new;
end;
$$;

-- ── 4. 처음 기록할 때 카탈로그에 표지를 함께 넘긴다 ──────────────────────
--
-- 20261028000000 의 함수와 같고, 카탈로그 insert 에 cover_image 만 더한다.
-- 표지는 위 가드가 다시 검사하므로 여기서 거르지 않는다.
create or replace function public.apply_book_catalog_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare g public.global_books;
begin
  select * into g from public.global_books where isbn = new.isbn;
  if not found then
    insert into public.global_books(isbn,title,author,publisher,cover_image,source,submitted_by,review_status)
    values(new.isbn,new.title,new.author,new.publisher,new.cover_image,'manual',new.user_id,'pending')
    on conflict (isbn) do nothing;
    select * into g from public.global_books where isbn = new.isbn;
  end if;
  if pg_trigger_depth() > 1 and tg_op = 'UPDATE' then
    new.requested_public := old.requested_public;
  elsif tg_op = 'INSERT' then
    new.requested_public := new.is_public;
  elsif old.catalog_review_status <> 'approved' and new.requested_public is distinct from old.requested_public then
    new.requested_public := new.requested_public;
  elsif old.catalog_review_status = 'approved' or new.is_public is distinct from old.is_public then
    new.requested_public := new.is_public;
  else
    new.requested_public := old.requested_public;
  end if;
  new.catalog_review_status := g.review_status;
  new.source := g.source;
  -- 공용 서지 정보는 카탈로그를 기준으로 한다. 승인 ISBN에 다른 정보를 넣는 우회도 막는다.
  new.title := g.title; new.author := g.author; new.publisher := g.publisher;
  new.sub_title := g.sub_title; new.description := g.description;
  new.pub_date := g.pub_date; new.category := g.category;
  new.cover_image := g.cover_image; new.provider_item_id := g.provider_item_id;
  if g.source = 'manual' then new.spine_image := null; end if;
  if g.review_status <> 'approved' then new.is_public := false; end if;
  return new;
end;
$$;

commit;
