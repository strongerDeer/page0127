-- 어드민 "어디까지 봤나" 표시 (2026-11-24, HJ: 메뉴 숫자 배지 + DB 저장 선택)
--
-- 회원 관리 메뉴 옆에 "마지막으로 회원 관리를 연 뒤 가입한 사람 수"를 띄운다.
-- 마지막으로 연 시각을 브라우저 쿠키가 아니라 DB에 두는 이유: 맥과 폰에서 번갈아 보므로
-- 한쪽에서 확인하면 다른 쪽 숫자도 같이 0이 되어야 한다.
--
-- key 로 칸을 나눠 두면 나중에 다른 메뉴(예: 책 이야기 댓글)도 같은 표로 쓸 수 있다.
-- 운영자 전용: RLS 켜고 정책 없음 → service_role 만 읽고 쓴다(admin_events 와 같은 방식).

CREATE TABLE IF NOT EXISTS admin_seen_marks (
  key     text PRIMARY KEY CHECK (key IN ('members')),
  seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_seen_marks ENABLE ROW LEVEL SECURITY;

-- 처음부터 지금까지의 가입자 전부가 "새 회원"으로 뜨지 않게, 적용 시각을 확인한 것으로 둔다
INSERT INTO admin_seen_marks (key, seen_at)
VALUES ('members', now())
ON CONFLICT (key) DO NOTHING;
