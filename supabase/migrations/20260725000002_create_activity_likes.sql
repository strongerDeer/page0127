-- activity_likes: 운영 대시보드에서 만들어져 마이그레이션에 없던 테이블(스키마 drift)을
-- 코드로 담는다(users/reading_records와 같은 케이스). db reset한 로컬에 이 테이블이 없어
-- 좋아요(INSERT)가 500으로 실패하던 문제를 해소한다.
--
-- 정책: 좋아요 조회는 공개(Anyone), 추가·삭제는 본인만. 운영 정의를 그대로 재현한다.
-- 운영엔 이미 존재하므로 모든 구문은 idempotent(IF NOT EXISTS / drop→create)하여 운영 반영도 안전.

create table if not exists public.activity_likes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (activity_id, user_id)
);

create index if not exists idx_activity_likes_activity_id on public.activity_likes(activity_id);
create index if not exists idx_activity_likes_user_id on public.activity_likes(user_id);

alter table public.activity_likes enable row level security;

-- 좋아요는 누구나 조회 가능(피드·책 타임라인의 좋아요 수 표시)
drop policy if exists "Anyone can view likes" on public.activity_likes;
create policy "Anyone can view likes"
  on public.activity_likes for select
  using (true);

-- 추가·삭제는 본인만
drop policy if exists "Users can add their own likes" on public.activity_likes;
create policy "Users can add their own likes"
  on public.activity_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own likes" on public.activity_likes;
create policy "Users can delete their own likes"
  on public.activity_likes for delete
  using (auth.uid() = user_id);
