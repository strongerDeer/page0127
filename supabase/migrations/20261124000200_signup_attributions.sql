-- 가입자가 처음 어디서 왔나 (2026-11-24, HJ: 어드민 점검 1번 "누가 어디서 와서 가입했나")
--
-- GA 는 이름 없는 방문 단위, DB 는 가입자 단위라 둘을 잇는 고리가 없었다.
-- 첫 방문 때 proxy 가 출처를 httpOnly 쿠키(p27_ft)에 적어 두고, 가입 콜백이 이 표로 옮긴다.
--
-- 담는 것: 출처(utm_source·앱 이름·들어온 사이트 도메인), utm_medium·campaign, 첫 페이지 경로, 첫 방문 시각.
-- 담지 않는 것: 전체 주소·검색어·IP.
--
-- profiles 칸이 아니라 따로 둔 이유: profiles 는 사용자가 자기 행을 UPDATE 할 수 있어서
-- 칸을 붙이면 트리거로 막아야 한다. 따로 두고 RLS 켜고 정책 없음 → service_role 만 읽고 쓴다.
-- 회원이 탈퇴하면 profiles 와 함께 지워진다(ON DELETE CASCADE).

CREATE TABLE IF NOT EXISTS signup_attributions (
  user_id        uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  source         text NOT NULL CHECK (char_length(source) BETWEEN 1 AND 60),
  medium         text CHECK (medium IS NULL OR char_length(medium) <= 30),
  campaign       text CHECK (campaign IS NULL OR char_length(campaign) <= 80),
  referrer_host  text CHECK (referrer_host IS NULL OR char_length(referrer_host) <= 100),
  landing_path   text CHECK (landing_path IS NULL OR char_length(landing_path) <= 200),
  first_seen_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signup_attributions_created_at_idx
  ON signup_attributions (created_at);

ALTER TABLE signup_attributions ENABLE ROW LEVEL SECURITY;
