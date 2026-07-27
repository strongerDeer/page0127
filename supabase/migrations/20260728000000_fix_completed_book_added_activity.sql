-- 완독 상태로 담긴 책의 활동을 book_completed 로 바로잡는다.
--
-- 배경: 2026-07-27 이전 코드는 책을 담을 때 status 와 무관하게 book_added 만
-- 만들었다(app/api/books/route.ts). 그래서 "완독"으로 담은 책도 피드·스트림에
-- "책장에 담았어요"로 뜬다.
--
-- 코드 수정만으로는 과거 데이터가 낫지 않는다. PATCH 의 완독 활동 생성은
-- "완독이 아니었다가 완독이 되는" 전환만 잡으므로(20260725 이전부터 그랬다),
-- 처음부터 완독이던 책은 조건에 영영 걸리지 않는다.
--
-- 처리: 완독 상태인데 book_completed 활동이 하나도 없는 책에 한해, 그 책의
-- book_added 활동 하나를 book_completed 로 바꾼다. 담기와 완독이 실제로는 한
-- 사건이었으므로 줄을 늘리지 않고 타입만 바로잡는다(새 코드가 만드는 모양과 같다).
--
-- 건드리지 않는 것:
-- - 담은 뒤 완독으로 바꾼 책 → book_completed 가 이미 있다
-- - 완독이 아닌 책 → 담기 기록이 맞다
-- - 한 책에 book_added 가 여럿인 이상 데이터 → distinct on 으로 하나만 바꾼다
--
-- ⚠️ activity_type 을 UPDATE 하므로 되돌릴 수 없다(어느 행이 원래 book_added
--    였는지 남지 않는다). 영향 건수는 아래 NOTICE 로 확인한다.

DO $$
DECLARE
  affected integer;
BEGIN
  WITH target AS (
    SELECT DISTINCT ON (a.book_id) a.id
    FROM public.activities a
    JOIN public.books b ON b.id = a.book_id
    WHERE a.activity_type = 'book_added'
      AND b.status = 'completed'
      AND NOT EXISTS (
        SELECT 1
        FROM public.activities c
        WHERE c.book_id = a.book_id
          AND c.activity_type = 'book_completed'
      )
    ORDER BY a.book_id, a.created_at DESC
  )
  UPDATE public.activities
  SET activity_type = 'book_completed'
  WHERE id IN (SELECT id FROM target);

  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE '완독으로 담긴 책 활동 보정: % 건', affected;
END $$;
