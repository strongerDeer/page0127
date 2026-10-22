-- 완독일을 "연도만" 또는 "모름"으로 기록할 수 있게 한다
-- 작성일: 2026-10-22
--
-- 왜: 인생책처럼 오래전에 읽은 책은 완독 날짜를 기억하지 못한다. 지금은 완독이면
-- 날짜를 반드시 채우게 되어 있어(비우면 오늘), 오래된 책이 "올해 읽은 책"으로 잡힌다.
--
-- 완독 시점의 정밀도를 세 가지로 나눈다.
--   날짜   completed_date = 'YYYY-MM-DD', completed_year = NULL
--   연도만 completed_date = NULL,         completed_year = YYYY
--   모름   completed_date = NULL,         completed_year = NULL  → 전체 통계에만 들어간다
--
-- 연도만일 때 completed_date 에 'YYYY-01-01'을 넣지 않는 이유: 1월 1일 배지와 캘린더,
-- 주간 회고가 그 날짜를 진짜 완독일로 읽는다. 날짜 컬럼에는 진짜 날짜만 둔다.
--
-- 둘이 함께 차 있으면 어느 쪽이 맞는지 알 수 없으므로 CHECK 로 막는다.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS completed_year SMALLINT;

ALTER TABLE public.books
  DROP CONSTRAINT IF EXISTS books_completed_year_check;

ALTER TABLE public.books
  ADD CONSTRAINT books_completed_year_check
  CHECK (
    completed_year IS NULL
    OR (completed_year BETWEEN 1900 AND 2100 AND completed_date IS NULL)
  );

COMMENT ON COLUMN public.books.completed_year IS
  '완독 연도만 아는 경우의 연도. 날짜를 알면 completed_date 를 쓰고 이 값은 NULL 이다.';
