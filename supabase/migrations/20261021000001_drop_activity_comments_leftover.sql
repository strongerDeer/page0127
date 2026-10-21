-- 20261021000000 에서 건너뛴 activity_comments 를 마저 정리한다.
-- 작성일: 2026-10-21
--
-- 배경: 운영의 activity_comments 에 book_comments 로 옮겨지지 않은 행이 1건 남아
--   20261021000000 이 이 테이블만 건너뛰었다(2026-10-21 운영 조회로 확인).
--   id 11068a9e-c15a-4b29-bd2f-945a285d7f53, 내용 'gggg', 2026-07-24 작성.
--   이관(07-25) 전에 단 테스트 댓글이라 옮기지 않고 지운다.
--
-- 안전장치: 이관 안 된 행이 "그 1건뿐"일 때만 지운다. 다른 행이 생겨 있으면
--   아무것도 지우지 않고 WARNING 으로 남은 행 수를 알린다(이유는 20261021000000 참고).
--   dev 처럼 이미 테이블이 없는 환경에서는 아무 일도 하지 않는다.
--
-- ⚠️ 삭제한 댓글은 되돌릴 수 없다.

DO $$
DECLARE
  test_comment_id constant uuid := '11068a9e-c15a-4b29-bd2f-945a285d7f53';
  remaining bigint;
BEGIN
  IF to_regclass('public.activity_comments') IS NOT NULL THEN
    SELECT count(*) INTO remaining
    FROM public.activity_comments ac
    WHERE ac.id <> test_comment_id
      AND NOT EXISTS (SELECT 1 FROM public.book_comments bc WHERE bc.id = ac.id);

    IF remaining = 0 THEN
      DROP TABLE public.activity_comments;
      RAISE NOTICE 'activity_comments 삭제 (테스트 댓글 1건 포함)';
    ELSE
      RAISE WARNING 'activity_comments 건너뜀: 테스트 댓글 외에 이관 안 된 행 % 건', remaining;
    END IF;
  END IF;

  -- activity_comments 의 1depth 트리거가 쓰던 함수
  IF to_regclass('public.activity_comments') IS NULL THEN
    DROP FUNCTION IF EXISTS public.check_comment_depth();
  END IF;
END $$;
