-- reading_records: 운영 대시보드에서 만들어져 마이그레이션에 없던 테이블(스키마 drift)을
-- 코드로 담는다. 뒤 마이그레이션(20260723000002)이 이 테이블에 FK를 추가하므로 그 전에
-- 반드시 존재해야 하고, 없으면 clean `supabase db reset`이 여기서 실패한다.
--
-- 운영엔 이미 존재하므로 IF NOT EXISTS로 안전하게 만든다(운영의 실제 스키마는 건드리지 않음).
-- page0127 앱은 현재 이 테이블을 직접 사용하지 않아, FK가 요구하는 user_id를 포함한
-- 최소 컬럼만 둔다. (운영의 실제 컬럼과 다를 수 있으며, 운영 반영 시엔 IF NOT EXISTS로
-- 건너뛰어지므로 문제 없다.)
create table if not exists public.reading_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  created_at timestamptz not null default now()
);

alter table public.reading_records enable row level security;
