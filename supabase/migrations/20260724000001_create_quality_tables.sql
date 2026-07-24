-- 품질 측정 결과 저장.
-- 쓰기는 CI의 service_role(RLS 우회). 읽기는 admin 서버 코드가 createAdminClient로
-- (역시 service_role). 그래서 authenticated/anon용 정책은 만들지 않는다(= 전면 거부).
-- service_role의 테이블 접근 권한은 직전 마이그레이션(20260724000000)의
-- `alter default privileges ... grant all ... to service_role`로 자동 상속된다.

create table public.quality_records (
  id            uuid primary key default gen_random_uuid(),
  measured_at   timestamptz not null default now(),
  git_ref       text,
  form_factors  text[] not null,
  record        jsonb not null,
  report_md     text,
  schema_version int not null default 1
);
alter table public.quality_records enable row level security;

create index quality_records_measured_at_idx
  on public.quality_records (measured_at desc);

-- CrUX 25주 추세 — period_end 기준 upsert 병합(25주 롤링 윈도 밖 과거 보존).
create table public.quality_field_history (
  period_end        date not null,
  metric            text not null,
  period_start      date not null,
  p75               double precision,
  good              double precision,
  needs_improvement double precision,
  poor              double precision,
  primary key (period_end, metric)
);
alter table public.quality_field_history enable row level security;
