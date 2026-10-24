-- 유저 모집(인스타 홍보) 전 보안 보강
-- 작성일: 2026-10-23
--
-- 한 파일에 묶은 이유: 모두 "브라우저에 실린 anon 키 + 본인 JWT 로 REST 를 직접 부르면
-- 앱의 검사를 건너뛸 수 있다"는 같은 종류의 구멍이고, db push 를 한 번에 끝내기 위해서다.
--
--   1. 나만의 메모(books.personal_memo)를 주인만 읽는 테이블로 옮긴다
--   2. 알림 위조를 막고, 보낸 사람이 안 읽힌 알림을 거둘 수 있게 한다
--   3. 프로필 사진 버킷에 크기·형식·경로 제한을 건다
--   4. 사용자가 쓰는 글에 DB 길이 상한을 건다
--   5. 정지 표시(profiles.status·suspended_until)를 서버만 바꾸게 한다
--
-- 모든 구문은 다시 돌려도 안전하게(idempotent) 쓴다.

-- ── 1. 나만의 메모 ───────────────────────────────────────────────────────
--
-- 왜: RLS 는 "어느 행"만 고르고 "어느 컬럼"은 못 고른다. 공개 책은 행이 누구에게나
-- 열려 있어서 `/rest/v1/books?select=personal_memo&is_public=eq.true` 한 번이면 공개 책의
-- 메모가 전부 나왔다. 컬럼 권한을 거두면 주인도 자기 메모를 못 읽으므로(권한은 행을 가리지
-- 않는다) 주인만 읽는 별도 테이블로 옮긴다.
--
-- books.personal_memo 컬럼은 지우지 않고 "받는 창구"로만 남긴다. 아래 트리거가 들어온 값을
-- book_memos 로 옮기고 컬럼은 NULL 로 비운다. 그래서
--   - db push 와 배포 사이에 도는 옛 코드가 메모를 저장해도 깨지지 않고 새 테이블로 들어가며,
--   - 새 코드는 지금처럼 personal_memo 를 보내면 된다('' 를 보내면 메모 삭제).

create table if not exists public.book_memos (
  book_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  memo text not null check (char_length(memo) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- books 의 BEFORE INSERT 트리거 안에서 memo 행을 먼저 넣으므로, 그 시점엔 books 행이 아직 없다.
-- FK 검사를 트랜잭션 끝으로 미뤄야(deferred) 같은 문장 안에서 순서가 맞는다.
alter table public.book_memos drop constraint if exists book_memos_book_id_fkey;
alter table public.book_memos
  add constraint book_memos_book_id_fkey
  foreign key (book_id) references public.books(id)
  on delete cascade
  deferrable initially deferred;

create index if not exists idx_book_memos_user_id on public.book_memos(user_id);

alter table public.book_memos enable row level security;

drop policy if exists "Owners manage own book memos" on public.book_memos;
create policy "Owners manage own book memos"
  on public.book_memos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.book_memos to authenticated;
grant all on public.book_memos to service_role;
revoke all on public.book_memos from anon;

create or replace function public.move_personal_memo_to_book_memos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.personal_memo is not null then
    if btrim(new.personal_memo) = '' then
      delete from public.book_memos where book_id = new.id;
    else
      insert into public.book_memos (book_id, user_id, memo)
      values (new.id, new.user_id, new.personal_memo)
      on conflict (book_id)
      do update set memo = excluded.memo, user_id = excluded.user_id, updated_at = now();
    end if;
    new.personal_memo := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.move_personal_memo_to_book_memos() from public, anon, authenticated;

drop trigger if exists books_move_personal_memo on public.books;
create trigger books_move_personal_memo
  before insert or update of personal_memo on public.books
  for each row execute function public.move_personal_memo_to_book_memos();

-- 기존 메모를 옮기고 컬럼을 비운다.
insert into public.book_memos (book_id, user_id, memo)
select id, user_id, personal_memo
from public.books
where personal_memo is not null and btrim(personal_memo) <> ''
on conflict (book_id) do nothing;

update public.books set personal_memo = null where personal_memo is not null;

-- ── 2. 알림 ─────────────────────────────────────────────────────────────
--
-- 왜: INSERT 정책이 `auth.uid() = actor_id` 하나라서, 로그인한 누구나 남의 user_id 로
-- type='weekly_recap'·message='아무 문구' 알림을 넣을 수 있었다. 회상·읽는 중 알림은
-- message 를 그대로 화면에 그리므로 운영자 공지처럼 보이는 사칭 문구를 전 회원에게 뿌릴 수 있다.
-- 회상·읽는 중 알림은 크론(service_role)이 넣으므로 이 정책과 무관하다.

drop policy if exists "Users can create notifications as themselves" on public.notifications;
create policy "Users can create notifications as themselves"
  on public.notifications
  for insert
  with check (
    auth.uid() = actor_id
    and user_id <> actor_id
    and type in ('follow', 'comment', 'like')
    and message is null
  );

-- 보낸 사람이 취소(언팔로우·좋아요 취소·댓글 삭제)하면, 받는 사람이 아직 안 읽은 알림을 거둔다.
-- 기존 DELETE 정책은 받는 사람(user_id) 것만 있어서, 언팔로우 라우트의 정리 코드가
-- RLS 에 걸려 아무것도 지우지 못하고 있었다.
drop policy if exists "Actors can retract unread notifications" on public.notifications;
create policy "Actors can retract unread notifications"
  on public.notifications
  for delete
  using (
    auth.uid() = actor_id
    and is_read = false
    and type in ('follow', 'comment', 'like')
  );

-- ── 3. 프로필 사진 버킷 ──────────────────────────────────────────────────
--
-- 왜: 4MB·이미지 형식 검사가 서버 액션에만 있어서 Storage API 를 직접 부르면 아무 파일·크기나
-- 아무 경로에 올라갔다. 앱의 실제 규칙(updateProfileAction)과 같게 DB 쪽에도 건다.

update storage.buckets
set file_size_limit = 4194304, -- 4MB = MAX_PROFILE_IMAGE_BYTES
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'profiles';

drop policy if exists "Authenticated users can upload" on storage.objects;
create policy "Authenticated users can upload" on storage.objects
  for insert with check (
    bucket_id = 'profiles'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = 'avatars'
    and (auth.uid())::text = split_part(storage.filename(name), '_', 1)
  );

-- ── 4. 글 길이 상한 ─────────────────────────────────────────────────────
--
-- 화면의 maxLength 보다 넉넉하게 잡는다 — 목적은 UX 가 아니라 수 MB 짜리 글로 화면을
-- 느리게 만드는 남용을 막는 것이다. NOT VALID: 기존 행은 검사하지 않고 새로 쓰는 값만 본다
-- (혹시 긴 기존 행이 있어도 push 가 멈추지 않게).

alter table public.book_comments drop constraint if exists book_comments_content_length;
alter table public.book_comments
  add constraint book_comments_content_length
  check (char_length(content) <= 2000) not valid;

alter table public.books drop constraint if exists books_one_line_review_length;
alter table public.books
  add constraint books_one_line_review_length
  check (one_line_review is null or char_length(one_line_review) <= 300) not valid;

alter table public.profiles drop constraint if exists profiles_nickname_length;
alter table public.profiles
  add constraint profiles_nickname_length
  check (nickname is null or char_length(nickname) <= 100) not valid;

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles
  add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 500) not valid;

-- ── 5. 정지 표시는 서버만 ────────────────────────────────────────────────
--
-- 실제 차단은 Auth ban 이라 이미 안전하다. 다만 profiles.status·suspended_until 은
-- 본인 UPDATE 가 열려 있어 정지된 사람이 어드민 화면의 표시를 'active' 로 되돌릴 수 있었다.
-- 요청 역할(anon·authenticated)이 보낸 값은 버리고 기존 값을 지킨다.
-- service_role(어드민 정지 액션)과 마이그레이션(postgres)은 그대로 바꿀 수 있다.

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
    else
      new.status := old.status;
      new.suspended_until := old.suspended_until;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_moderation_columns() from public, anon, authenticated;

drop trigger if exists profiles_protect_moderation_columns on public.profiles;
create trigger profiles_protect_moderation_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_moderation_columns();
