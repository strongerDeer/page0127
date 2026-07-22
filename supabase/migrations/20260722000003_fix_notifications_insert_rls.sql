-- notifications INSERT 정책 강화
-- 작성일: 2026-07-22
--
-- 기존 "System can create notifications" 정책은 WITH CHECK (true)라서
-- 실제로는 아무나 임의의 user_id/actor_id로 알림을 위조해 삽입할 수 있었다.
-- 주석은 "서버 API에서만 생성 가능"을 전제했지만 DB가 이를 강제하지 않았고,
-- POST /api/notifications도 인증 확인 없이 body 값을 그대로 신뢰하고 있었다
-- (앱 레이어는 별도로 수정 — actor_id를 인증된 사용자로 고정).
--
-- 여기서는 DB 레벨에서도 actor_id가 실제 로그인한 사용자와 일치할 때만
-- 삽입을 허용하도록 좁힌다 (follows/book_likes 테이블과 동일한 패턴).

DROP POLICY IF EXISTS "System can create notifications" ON notifications;

CREATE POLICY "Users can create notifications as themselves"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = actor_id);
