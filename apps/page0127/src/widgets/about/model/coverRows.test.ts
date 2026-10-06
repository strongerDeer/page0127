import { describe, expect, it } from 'vitest';

import {
  MIN_MARQUEE_COVERS,
  type ShelfBook,
  splitCoverRows,
} from './coverRows';

const book = (
  i: number,
  cover: string | null = `https://image.yes24.com/goods/${i}/L`
): ShelfBook => ({
  id: `b${i}`,
  title: `책 ${i}`,
  coverImage: cover,
  spineImage: null,
});

describe('splitCoverRows', () => {
  it('표지가 기준보다 적으면 띠를 그리지 않는다(null)', () => {
    // 로컬·개발 DB는 표지가 거의 없다 — 두세 권이 반복되며 도는 띠는 깨져 보인다
    const few = Array.from({ length: MIN_MARQUEE_COVERS - 1 }, (_, i) =>
      book(i)
    );
    expect(splitCoverRows(few)).toBeNull();
  });

  it('표지가 없는 책은 세지 않는다', () => {
    const mixed = [
      ...Array.from({ length: 7 }, (_, i) => book(i)),
      book(99, null),
      book(100, null),
    ];
    expect(splitCoverRows(mixed)).toBeNull();
  });

  it('두 줄로 나누고 윗줄이 한 권 더 많을 수 있다', () => {
    const rows = splitCoverRows(Array.from({ length: 9 }, (_, i) => book(i)));
    expect(rows?.[0]).toHaveLength(5);
    expect(rows?.[1]).toHaveLength(4);
  });

  it('최근 등록 순서를 지킨다', () => {
    const rows = splitCoverRows(Array.from({ length: 8 }, (_, i) => book(i)));
    expect(rows?.[0].map((b) => b.id)).toEqual(['b0', 'b1', 'b2', 'b3']);
  });
});
