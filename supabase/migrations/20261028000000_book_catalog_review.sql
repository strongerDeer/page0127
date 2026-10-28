-- 직접 등록 책은 개인 기록부터 허용하고, 검수 승인 후에만 공용 목록에 공개한다.
begin;
-- 백필 중에도 제출자 정보를 보존한다. 이 설정은 현재 마이그레이션 트랜잭션에서만 유효하다.
set local request.jwt.claim.role = 'service_role';
alter table public.global_books
  add column review_status text not null default 'pending'
    check (review_status in ('pending','approved','needs_changes','rejected')),
  add column submitted_by uuid references auth.users(id) on delete set null,
  add column source_url text,
  add column review_note text,
  add column reviewed_by uuid references auth.users(id) on delete set null,
  add column reviewed_at timestamptz,
  add column review_version int not null default 1;

-- 기존 공급자 도서만 승인 상태로 보존한다. 수동 도서는 다시 검수한다.
update public.global_books set review_status = 'approved' where source <> 'manual';
update public.global_books set cover_image = null, spine_image = null, back_image = null where source = 'manual';
update public.global_books set submitted_by = (
  select b.user_id from public.books b where b.isbn = global_books.isbn order by b.created_at limit 1
) where source = 'manual';

alter table public.books
  add column catalog_review_status text not null default 'approved'
    check (catalog_review_status in ('pending','approved','needs_changes','rejected')),
  add column requested_public boolean not null default true;
update public.books set requested_public = is_public;

create table public.book_review_history (
  id uuid primary key default gen_random_uuid(),
  global_book_id uuid not null references public.global_books(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  decision text not null check (decision in ('approved','needs_changes','rejected')),
  note text,
  book_snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.book_review_history enable row level security;
grant select, insert on public.book_review_history to service_role;
grant update (title, author, publisher, source_url, review_status) on public.global_books to authenticated;
create index global_books_review_queue on public.global_books(review_status, created_at) where source = 'manual';

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
    -- 초기 정책: 직접 올리는 표지는 받지 않는다. 승인 후에도 기본 표지를 쓴다.
    new.cover_image := null; new.spine_image := null; new.back_image := null;
    new.provider_item_id := null;
  end if;
  new.review_version := case when tg_op = 'INSERT' then 1 else old.review_version + 1 end;
  return new;
end;
$$;
create trigger guard_catalog_submission before insert or update on public.global_books
for each row execute function public.guard_catalog_submission();

-- 기존 허용 정책이 OR로 남아 있어도 미승인 공용 도서가 노출되지 않는다.
create policy "Catalog approval visibility" on public.global_books as restrictive for select
using (review_status = 'approved' or submitted_by = auth.uid());
create policy "Own catalog submissions update" on public.global_books for update to authenticated
using (submitted_by = auth.uid() and review_status <> 'approved')
with check (submitted_by = auth.uid() and review_status = 'pending');

-- 직접 REST 호출로 source/공개 여부/검수 상태를 위조해도 같은 검수 흐름을 거친다.
create or replace function public.apply_book_catalog_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare g public.global_books;
begin
  select * into g from public.global_books where isbn = new.isbn;
  if not found then
    insert into public.global_books(isbn,title,author,publisher,source,submitted_by,review_status)
    values(new.isbn,new.title,new.author,new.publisher,'manual',new.user_id,'pending')
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
-- 현재도 false인 대기 책을 명시적으로 비공개로 저장하는 경우까지 반영한다.
create or replace function public.capture_book_public_preference()
returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_trigger_depth() = 1 then new.requested_public := new.is_public; end if;
  return new;
end;
$$;
create trigger aa_capture_book_public_preference before update of is_public on public.books
for each row execute function public.capture_book_public_preference();

create trigger apply_book_catalog_review before insert or update on public.books
for each row execute function public.apply_book_catalog_review();

create or replace function public.sync_catalog_review_to_readings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.books set catalog_review_status = new.review_status,
    is_public = case when new.review_status = 'approved' then requested_public else false end
  where isbn = new.isbn;
  return new;
end;
$$;
create trigger sync_catalog_review_to_readings after update on public.global_books
for each row execute function public.sync_catalog_review_to_readings();

-- 공용 카탈로그가 없는 기존 기록도 검수 없이 공개 상태로 남지 않게 한다.
update public.books set catalog_review_status = 'pending'
where not exists(select 1 from public.global_books g where g.isbn = books.isbn);

-- 기존 수동 기록도 비공개로 보호하고 표지를 제거한다.
update public.books set catalog_review_status = g.review_status
from public.global_books g where books.isbn = g.isbn and g.source = 'manual';

create policy "Only approved catalog readings are public" on public.books as restrictive for select
using (user_id = auth.uid() or catalog_review_status = 'approved');
-- 팔로워 활동 정책이 남아 있어도 미승인 책 활동을 노출하지 않는다.
create policy "Only visible book activities" on public.activities as restrictive for select
using (user_id = auth.uid() or exists(select 1 from public.books b where b.id = activities.book_id and b.is_public));

create or replace function public.review_catalog_book(
  p_book_id uuid, p_version int, p_decision text, p_note text, p_reviewer uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare g public.global_books;
begin
  if p_decision not in ('approved','needs_changes','rejected') or p_decision is null then
    raise exception '지원하지 않는 검수 상태입니다.' using errcode = '22023';
  end if;
  if length(coalesce(p_note,'')) > 1000 or (p_decision <> 'approved' and length(trim(coalesce(p_note,''))) = 0) then
    raise exception '보완 요청과 반려에는 사유가 필요합니다(최대 1000자).' using errcode = '22023';
  end if;
  select * into g from public.global_books where id = p_book_id and source = 'manual' for update;
  if not found or g.review_version <> p_version then
    raise exception '등록 정보가 변경되었습니다. 새로고침 후 다시 검수해 주세요.' using errcode = '40001';
  end if;
  if p_decision = 'approved' and (length(trim(g.title)) = 0 or length(trim(coalesce(g.author,''))) = 0) then
    raise exception '승인하려면 책 제목과 저자가 필요합니다.' using errcode = '22023';
  end if;
  insert into public.book_review_history(global_book_id,reviewer_id,decision,note,book_snapshot)
  values(g.id,p_reviewer,p_decision,nullif(trim(p_note),''),to_jsonb(g));
  update public.global_books set review_status = p_decision, review_note = nullif(trim(p_note),''),
    reviewed_by = p_reviewer, reviewed_at = now() where id = g.id;
end;
$$;
revoke all on function public.review_catalog_book(uuid,int,text,text,uuid) from public,anon,authenticated;
grant execute on function public.review_catalog_book(uuid,int,text,text,uuid) to service_role;
commit;
