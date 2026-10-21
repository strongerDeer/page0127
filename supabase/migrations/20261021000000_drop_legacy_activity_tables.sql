-- 앱에서 더 이상 읽지도 쓰지도 않는 레거시 테이블 4개를 정리한다.
-- 작성일: 2026-10-21
--
-- 대상과 배경
--   activity_comments : 댓글이 책 단위(book_comments)로 옮겨지며 20260725000004 에서 이관됐다.
--   activity_likes    : 같은 마이그레이션에서 book_record_likes 로 이관됐다.
--   comments          : baseline 시절의 활동 댓글 테이블. 이관 대상에도 없었고 앱이 쓰지 않는다.
--   reading_records   : 운영 대시보드에서 만들어진 드리프트 테이블(20260722120000 참고).
--                       앱이 쓰지 않는다. 운영에는 book_isbn 등 로컬에 없는 컬럼이 있다.
--
-- 안전장치: 데이터가 남아 있으면 지우지 않는다.
--   - activity_comments / activity_likes 는 "이관이 끝난 행만 있을 때" 지운다.
--   - comments / reading_records 는 이관처가 없으므로 "비어 있을 때만" 지운다.
--   조건이 안 맞으면 그 테이블만 건너뛰고 WARNING 으로 남은 행 수를 알린다.
--   (예외로 멈추지 않는 이유: 마이그레이션이 실패하면 이후 db push 가 모두 막힌다.)
--   건너뛴 테이블은 데이터를 확인한 뒤 새 마이그레이션으로 따로 지운다.
--
-- 적용 전 확인 쿼리(운영):
--   select 'comments', count(*) from public.comments
--   union all select 'activity_comments', count(*) from public.activity_comments
--   union all select 'activity_likes', count(*) from public.activity_likes
--   union all select 'reading_records', count(*) from public.reading_records;
--
-- ⚠️ DROP 은 되돌릴 수 없다. 필요하면 적용 전에 pg_dump 로 네 테이블을 백업해 둔다.

DO $$
DECLARE
  remaining bigint;
BEGIN
  -- 1) activity_comments: book_comments 로 옮겨지지 않은 행이 없을 때만
  IF to_regclass('public.activity_comments') IS NOT NULL THEN
    SELECT count(*) INTO remaining
    FROM public.activity_comments ac
    WHERE NOT EXISTS (SELECT 1 FROM public.book_comments bc WHERE bc.id = ac.id);

    IF remaining = 0 THEN
      DROP TABLE public.activity_comments;
      RAISE NOTICE 'activity_comments 삭제';
    ELSE
      RAISE WARNING 'activity_comments 건너뜀: book_comments 에 없는 행 % 건', remaining;
    END IF;
  END IF;

  -- 2) activity_likes: (사용자, 책) 쌍이 모두 book_record_likes 에 있을 때만
  IF to_regclass('public.activity_likes') IS NOT NULL THEN
    SELECT count(*) INTO remaining
    FROM public.activity_likes al
    JOIN public.activities a ON a.id = al.activity_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.book_record_likes bl
      WHERE bl.user_id = al.user_id AND bl.book_id = a.book_id
    );

    IF remaining = 0 THEN
      DROP TABLE public.activity_likes;
      RAISE NOTICE 'activity_likes 삭제';
    ELSE
      RAISE WARNING 'activity_likes 건너뜀: book_record_likes 에 없는 좋아요 % 건', remaining;
    END IF;
  END IF;

  -- 3) comments: 이관처가 없으므로 비어 있을 때만
  IF to_regclass('public.comments') IS NOT NULL THEN
    SELECT count(*) INTO remaining FROM public.comments;

    IF remaining = 0 THEN
      DROP TABLE public.comments;
      RAISE NOTICE 'comments 삭제';
    ELSE
      RAISE WARNING 'comments 건너뜀: 남은 행 % 건', remaining;
    END IF;
  END IF;

  -- 4) reading_records: 이관처가 없으므로 비어 있을 때만
  IF to_regclass('public.reading_records') IS NOT NULL THEN
    SELECT count(*) INTO remaining FROM public.reading_records;

    IF remaining = 0 THEN
      DROP TABLE public.reading_records;
      RAISE NOTICE 'reading_records 삭제';
    ELSE
      RAISE WARNING 'reading_records 건너뜀: 남은 행 % 건', remaining;
    END IF;
  END IF;

  -- activity_comments 의 1depth 트리거가 쓰던 함수. 테이블이 지워졌을 때만 함께 정리한다.
  -- (book_comments 는 자기 전용 트리거 함수를 따로 쓴다)
  IF to_regclass('public.activity_comments') IS NULL THEN
    DROP FUNCTION IF EXISTS public.check_comment_depth();
  END IF;
END $$;
