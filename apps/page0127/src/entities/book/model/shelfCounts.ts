import { getCompletedYear } from './completedWhen';

import type { Book } from '../types';

type ShelfRow = Pick<
  Book,
  'id' | 'isbn' | 'category' | 'completed_date' | 'completed_year'
>;

export type ShelfCounts = {
  /** 서로 다른 책 수 */
  totalBooks: number;
  /** 그중 올해 완독한 책 수 — 완독 연도를 모르는 책은 세지 않는다 */
  yearBooks: number;
  /** 서로 다른 책의 분류, 들어온 순서대로 (첫인상 판정용) */
  categories: (string | null)[];
};

/**
 * 같은 책인지 가르는 키 — ISBN 이 비어 있는 수기 등록 책은 서로 합쳐지면 안 되므로 id 로 가른다.
 * (model/dedupeReadings.ts 의 그룹 키와 같은 규칙)
 */
export const toShelfBookKey = (row: Pick<Book, 'id' | 'isbn'>): string =>
  row.isbn ? `isbn:${row.isbn}` : `id:${row.id}`;

/**
 * 완독 행들을 책장 숫자로 센다 — 공유 카드(OG)와 서재 명함이 같은 함수로 센다.
 * 카드에 "올해 12권"이라 적혔는데 눌러 들어간 화면이 9권이면 둘 중 하나는 거짓말이 된다.
 *
 * 행은 이미 걸러져 있어야 한다(공개 + 완독). 여기는 세기만 한다.
 * 재독은 한 권이다. 단, 올해 다시 읽은 책은 올해 권수에 들어간다 — 올해 읽은 건 사실이다.
 */
export const countShelf = (
  rows: ShelfRow[],
  currentYear: number
): ShelfCounts => {
  const seen = new Set<string>();
  const seenThisYear = new Set<string>();
  const categories: (string | null)[] = [];

  for (const row of rows) {
    const key = toShelfBookKey(row);
    if (!seen.has(key)) {
      seen.add(key);
      categories.push(row.category);
    }
    if (getCompletedYear(row) === currentYear) seenThisYear.add(key);
  }

  return {
    totalBooks: seen.size,
    yearBooks: seenThisYear.size,
    categories,
  };
};
