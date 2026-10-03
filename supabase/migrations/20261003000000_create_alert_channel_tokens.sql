-- ============================================================
-- 운영 알림 채널의 OAuth 토큰 (카카오톡 "나에게 보내기")
--
-- 왜 DB 에 두나:
--   Sentry 에러 알림을 운영자 카톡으로 받는다. 카카오 토큰은 **바뀌는 값**이다 —
--   액세스 토큰은 약 12시간, 리프레시 토큰은 약 60일이고, 갱신할 때 새 값이 돌아온다.
--   환경변수는 런타임에 고칠 수 없으므로 갱신 결과를 저장할 곳이 필요하다.
--
-- 왜 행이 채널당 하나인가:
--   운영자 한 명의 카톡으로만 보낸다. channel 을 기본 키로 두어 "다시 연결"은 덮어쓰기가 된다.
--
-- 보안:
--   토큰은 그 자체로 운영자 카톡에 메시지를 보낼 수 있는 비밀값이다.
--   RLS 켜고 정책 없음 + anon·authenticated 권한 회수 → service_role 만 읽고 쓴다.
-- ============================================================

create table if not exists public.alert_channel_tokens (
  channel                   text        primary key check (channel in ('kakao')),
  access_token              text        not null,
  access_token_expires_at   timestamptz not null,
  refresh_token             text        not null,
  refresh_token_expires_at  timestamptz not null,
  updated_at                timestamptz not null default now()
);

comment on table public.alert_channel_tokens is
  '운영 알림(카카오톡 나에게 보내기) OAuth 토큰. service_role 전용. 갱신될 때마다 덮어쓴다.';

alter table public.alert_channel_tokens enable row level security;

-- Supabase 기본 권한이 새 테이블을 anon·authenticated 에게도 열어 둔다.
-- RLS 정책이 없어 어차피 0행이지만, 비밀값 테이블이라 권한 자체를 거둔다(두 겹).
revoke all on table public.alert_channel_tokens from anon, authenticated;
