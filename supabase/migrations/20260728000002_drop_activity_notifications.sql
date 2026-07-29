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
--
-- 적용 상태(2026-07-28 확인): 운영·개발 DB 모두 이 번호(...000002)로 기록돼 있다.
--   확인 방법: select version from supabase_migrations.schema_migrations
--              where version like '202607280%' order by version;
--   DELETE 라 재실행돼도 0 건으로 끝나 무해하지만, 기록은 이 번호가 정본이다.
--
-- 번호 주의: 원래 20260728000001 이었는데 다른 작업(quality_rum_samples)이 같은 번호를
-- 먼저 쓰는 바람에 ...000002 로 밀었다. schema_migrations 는 버전 숫자가 PK 라, 같은
-- 번호면 SQL 은 실행되고 기록만 실패해(23505) 이후 모든 db push 가 같은 자리에서 막힌다.
-- 여러 브랜치가 같은 날 마이그레이션을 만들 때는 번호가 겹치지 않는지 먼저 확인할 것.

DO $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM public.notifications
  WHERE target_type IN ('activity', 'comment');

  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE '갈 곳 없는 알림 삭제: % 건', removed;
END $$;
