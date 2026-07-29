-- 인생책을 '회독'이 아니라 '책' 단위 속성으로 맞춘다
-- 작성일: 2026-07-29
--
-- 배경: 재독은 books 에 새 행으로 저장된다(회독마다 완독일·평점·리뷰가 따로
-- 있어야 하므로). 그래서 1회독 때만 '인생책'을 체크하면 같은 책인데 회독마다
-- 값이 달라진다. 책장은 회독을 한 권으로 합쳐 "인생책"으로 보여주는데,
-- 그 책을 눌러 들어가면 최신 회독 행이 열리면서 "인생책이 아님"으로 보였다.
--
-- 규칙: 인생책은 그 '책'을 꼽은 것이다. 한 번이라도 인생책으로 꼽았으면
-- 같은 책의 모든 회독이 인생책이다.
--
-- 이 마이그레이션은 기존 데이터를 그 규칙에 맞춘다(백필). 앞으로의 쓰기는
-- API 라우트(app/api/books)가 같은 규칙으로 함께 갱신한다.

-- 같은 사용자 + 같은 ISBN 묶음에 인생책이 하나라도 있으면 전부 true 로 올린다.
-- ISBN 이 비어 있는 수기 등록 책은 묶을 근거가 없으므로 건드리지 않는다
-- (앱의 그룹 키도 같은 규칙 — entities/book/model/dedupeReadings.ts 참고).
UPDATE books AS target
SET
  is_life_book = true,
  updated_at = now()
FROM (
  SELECT
    user_id,
    isbn
  FROM books
  WHERE
    is_life_book = true
    AND isbn IS NOT NULL
    AND isbn <> ''
  GROUP BY user_id, isbn
) AS life
WHERE
  target.user_id = life.user_id
  AND target.isbn = life.isbn
  AND target.is_life_book = false;
