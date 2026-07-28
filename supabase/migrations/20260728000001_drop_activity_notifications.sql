-- 활동 단위 알림을 정리한다.
--
-- 배경: 댓글·좋아요 대상이 활동에서 책으로 옮겨졌고(계획 1·2), 계획 3에서 활동
-- 상세 페이지(/feed/[activityId])와 활동 댓글·좋아요 API 를 제거했다. 그 결과
-- target_type='activity' 알림은 갈 곳이 없다.
--
-- 'comment' 도 함께 지운다 — 생성하는 코드가 한 곳도 없는 죽은 값이다
-- (grep -rn "target_type:" app 으로 확인).
--
-- 실사용자가 없는 시점이라 잃는 알림이 없다. 남는 타입은 'book'·'global_book' 뿐이다.
--
-- ⚠️ 삭제한 알림은 되돌릴 수 없다. 영향 건수는 아래 NOTICE 로 확인한다.

DO $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM public.notifications
  WHERE target_type IN ('activity', 'comment');

  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE '갈 곳 없는 알림 삭제: % 건', removed;
END $$;
