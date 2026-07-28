-- 활동 단위 알림을 정리한다.
--
-- ⚠️ 버전 번호가 20260728000001 → 20260728000003 으로 바뀐 파일이다(2026-07-28).
-- 원래 번호를 create_quality_rum_samples 와 **둘이 같이 쓰고 있었고**, Supabase 는
-- 이 번호를 schema_migrations 의 PK 로 쓰기 때문에 `supabase db reset` 이 두 번째
-- INSERT 에서 죽었다(23505). 그 지점 뒤의 마이그레이션은 아예 적용되지 못했다.
-- 둘 중 이 파일을 옮긴 이유: 내용이 DELETE 라 **재실행이 무해**하다(이미 지워졌으면
-- 0 건). rum_samples 쪽은 `create table` 이라 재적용 시 already exists 로 실패한다.
-- 운영에 옛 번호가 이미 적용됐는지는 확인되지 않았다 — 로컬 db reset을 멈춘
-- 것과 같은 번호 중복 때문에 `supabase db push`도 이 자리에서 멈췄을 가능성이
-- 있다. 어느 쪽이든 안전하다: 이미 실행됐다면 이 DELETE는 0건 삭제로 끝나고,
-- 아직이라면 정상적으로 한 번 실행된다. 배포 전 실제 상태를 확인하려면:
--   select version from supabase_migrations.schema_migrations
--    where version like '202607280%' order by version;
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
