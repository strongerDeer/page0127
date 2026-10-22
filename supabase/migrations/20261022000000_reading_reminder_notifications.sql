-- 2주 넘게 읽는 중인 책 알림 (reading_reminder)
-- 작성일: 2026-10-22
--
-- 1) notifications.type 에 'reading_reminder' 를 더한다.
--    다른 사람이 아니라 '나'에게 오는 알림이라 actor_id = user_id(본인)로 넣는다.
--    삽입은 크론(service_role)만 한다 — RLS INSERT 정책(auth.uid() = actor_id)은 그대로 둔다.
--
-- 2) books.reading_reminded_at — 같은 책에 매일 알림이 쌓이지 않게 '이미 알렸음'을 책에 적는다.
--    알림 행으로 중복을 막으면, 사용자가 알림을 지우거나 30일 정리 크론이 지운 다음 날 다시 온다.
--    다시 읽기 시작해 시작일이 바뀌면(reminded_at < 시작일) 앱에서 다시 알린다.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'comment', 'like', 'reading_reminder'));

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS reading_reminded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.books.reading_reminded_at IS
  '2주 넘게 읽는 중 알림을 보낸 시각. 크론(/api/cron/reading-reminders)만 쓴다.';
