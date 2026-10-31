-- 어드민 기록 두 가지
-- 작성일: 2026-10-31
--
-- 1) admin_events — "그날 무슨 일이 있었나" 메모 (인스타 스토리 공유, 기능 출시, 모집 글 등)
--    유입분석·어드민 홈 추이 옆에 같이 보여, 숫자가 튄 이유를 나중에도 바로 알 수 있게 한다.
-- 2) account_deletions — 탈퇴 기록. 탈퇴는 auth.users 하드 삭제 + CASCADE 라 지금까지 흔적이 없었다.
--    개인정보처리방침상 탈퇴하면 개인정보를 지워야 하므로 **누구인지 알 수 있는 값(이메일·닉네임·
--    아이디·user_id)은 남기지 않고**, 통계에 필요한 값(가입일·탈퇴일·책 수·가입 경로)만 남긴다.
--
-- 둘 다 운영자 전용: RLS 켜고 정책 없음 → anon/일반 키로는 읽기·쓰기 불가, service_role 만 접근.

CREATE TABLE IF NOT EXISTS admin_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- KST 날짜 (어드민 기간과 같은 기준)
  event_date date NOT NULL,
  title      text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  note       text CHECK (note IS NULL OR char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_events_date_idx ON admin_events (event_date);

ALTER TABLE admin_events ENABLE ROW LEVEL SECURITY;

-- 첫 기록 — HJ 요청(2026-10-31)
INSERT INTO admin_events (event_date, title)
VALUES ('2026-10-30', '인스타 개인 스토리에 공유');

CREATE TABLE IF NOT EXISTS account_deletions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at    timestamptz NOT NULL DEFAULT now(),
  -- 가입 시각 (profiles.created_at). 얼마 만에 떠났는지 보려고 남긴다
  signed_up_at  timestamptz,
  -- 탈퇴 시점 등록 책 수 — 써 보고 떠났는지, 바로 떠났는지
  book_count    int NOT NULL DEFAULT 0,
  -- 'google' | 'kakao' 등
  provider      text
);

CREATE INDEX IF NOT EXISTS account_deletions_deleted_at_idx
  ON account_deletions (deleted_at DESC);

ALTER TABLE account_deletions ENABLE ROW LEVEL SECURITY;
