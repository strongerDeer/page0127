-- 웹푸시 구독 + 주간 회상 알림 (weekly_recap)
-- 작성일: 2026-10-22
--
-- 1) push_subscriptions — 브라우저(기기)마다 하나씩 생기는 푸시 구독.
--    한 사람이 폰·노트북에서 각각 켜면 행이 둘이다. endpoint 가 기기를 가리키므로 UNIQUE.
--
--    왜 service_role 전용인가:
--      같은 브라우저에서 다른 계정으로 로그인해 다시 켜면 endpoint 는 그대로고 주인만 바뀐다.
--      "주인 본인만 수정" RLS 로는 남의 행이 된 그 endpoint 를 넘겨받을 수 없다.
--      API(/api/push/subscriptions)가 로그인을 확인한 뒤 service_role 로 upsert 한다.
--      p256dh·auth 는 그 기기로 메시지를 보낼 수 있는 값이라 브라우저에 다시 내려줄 이유도 없다.
--      → RLS 켜고 정책 없음 + anon·authenticated 권한 회수 (alert_channel_tokens 와 같은 두 겹)
--
-- 2) notifications.type 에 'weekly_recap' 을 더한다.
--    reading_reminder 와 같은 '나에게 오는 알림' — actor_id = user_id(본인), 크론만 넣는다.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  -- 설정 화면에서 "어느 기기인지" 가늠할 때만 쓴다. 발송에는 쓰지 않는다
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

COMMENT ON TABLE public.push_subscriptions IS
  '웹푸시 구독(기기당 1행). service_role 전용 — /api/push/subscriptions 가 쓰고, 알림 발송이 읽는다. 만료(404/410)되면 발송 쪽이 지운다.';

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.push_subscriptions FROM anon, authenticated;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'comment', 'like', 'reading_reminder', 'weekly_recap'));
