import type { Book } from '../types';

/**
 * 같은 책의 회독 기록을 한 권으로 합친다.
 *
 * 재독은 books 테이블에 '새 행'으로 저장된다 — 회독마다 완독일·평점·리뷰가
 * 따로 있어야 하기 때문이다. 그래서 책장이 행을 그대로 그리면 2회독한 책이
 * 표지 두 장으로 늘어나고 권수도 부풀려진다.
 *
 * 여기서 정하는 규칙은 하나다:
 * **화면이 보여주는 범위 안에서 같은 책은 한 권으로 센다.**
 * 그래서 기간 필터를 끝낸 목록에 적용해야 한다 — 전체 뷰라면 전체 기준으로,
 * 2026년 뷰라면 2026년에 읽은 기록끼리만 합쳐진다.
 *
 * 합칠 때 남기는 값:
 * - 대표 = 가장 최근에 읽은 회독 (완독일 없으면 등록 시각, 그마저 같으면 회독 수)
 * - `is_life_book` = 회독 중 하나라도 인생책이면 true
 *   (1회독 때만 인생책으로 꼽았어도 '내 인생책'에서 사라지면 안 된다)
 * - `read_count` = 기록 중 최대값 (배지가 "몇 번 읽었나"를 말해야 한다)
 *
 * 입력 순서는 그대로 지킨다. 정렬은 호출부가 이미 끝낸 상태로 들어온다.
 */
export const dedupeReadings = (books: Book[]): Book[] => {
  // ISBN 이 비어 있으면(수기 등록 등) 키가 겹쳐 엉뚱한 책끼리 합쳐진다 → id 로 갈라둔다.
  // 여러 사람의 책이 섞인 목록에도 쓰일 수 있어 user_id 를 키에 포함한다.
  //
  // status 도 키다. 재독 중이면 '1회독 완독'과 '2회독 읽는 중'이 동시에 있는데,
  // 둘을 합치면 책이 '읽는 중' 칸으로 옮겨가면서 완독 책장에서 사라진다.
  // 같은 책이라도 놓이는 칸이 다르면 별개 항목으로 둔다.
  const groupKey = (book: Book) =>
    book.isbn
      ? `${book.user_id}:${book.status}:${book.isbn}`
      : `id:${book.id}`;

  // 최신 회독 판정용 시각. 완독일이 없는 기록은 등록 시각으로 대신한다.
  const readAt = (book: Book) =>
    new Date(book.completed_date ?? book.created_at).getTime();

  const isNewerReading = (candidate: Book, current: Book) => {
    const diff = readAt(candidate) - readAt(current);
    return diff !== 0 ? diff > 0 : candidate.read_count > current.read_count;
  };

  // 그룹별 대표를 고르면서, 어느 자리에 놓을지(원래 순서)도 함께 기억한다
  const groups = new Map<string, { order: number; book: Book }>();

  books.forEach((book, index) => {
    const key = groupKey(book);
    const group = groups.get(key);

    if (!group) {
      groups.set(key, { order: index, book });
      return;
    }

    const merged: Book = isNewerReading(book, group.book) ? book : group.book;

    groups.set(key, {
      order: group.order,
      book: {
        ...merged,
        is_life_book: group.book.is_life_book || book.is_life_book,
        read_count: Math.max(group.book.read_count, book.read_count),
      },
    });
  });

  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order)
    .map(({ book }) => book);
};
