-- reading_records: 계정 삭제 시 함께 지워지도록 CASCADE FK 추가
--
-- 배경:
--   계정 삭제는 auth.users 행 하나를 지우면 FK(ON DELETE CASCADE)로 딸린 데이터가
--   전부 정리되는 구조다 (docs/superpowers/specs/2026-07-23-account-deletion-fix-design.md).
--   그런데 reading_records는 대시보드에서 만들어져 마이그레이션에 없었고(스키마 드리프트),
--   user_id가 auth.users를 CASCADE로 참조하지 않아 탈퇴해도 이 테이블 행만 고아로 남을 수
--   있었다. 지금은 행이 0개라 안전하게 FK를 추가할 수 있다.
--
--   (참고: activity_likes도 대시보드 생성 테이블이지만 이미 CASCADE FK가 걸려 있어 정상.
--    user_follow_stats는 뷰라 대상 아님.)
--
-- 작성일: 2026-07-23

ALTER TABLE public.reading_records
DROP CONSTRAINT IF EXISTS reading_records_user_id_fkey;

ALTER TABLE public.reading_records
ADD CONSTRAINT reading_records_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 설명:
-- - 이제 계정(auth.users) 삭제 시 reading_records의 해당 사용자 행도 자동 삭제된다.
-- - 삭제 route는 auth.users만 지우면 되고, 이 테이블을 명시적으로 지울 필요가 없다.
