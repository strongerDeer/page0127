import { describe, expect, it } from 'vitest';

import { countShelf } from './shelfCounts';

type Row = Parameters<typeof countShelf>[0][number];

const row = (over: Partial<Row>): Row => ({
  id: 'id',
  isbn: '',
  category: null,
  completed_date: null,
  completed_year: null,
  ...over,
});

describe('countShelf', () => {
  it('서로 다른 책을 세고, 재독은 한 권이다', () => {
    const counts = countShelf(
      [
        row({ id: '1', isbn: 'A', category: '국내도서-소설/시/희곡' }),
        row({ id: '2', isbn: 'A', category: '국내도서-소설/시/희곡' }),
        row({ id: '3', isbn: 'B', category: '국내도서-에세이' }),
      ],
      2026
    );
    expect(counts.totalBooks).toBe(2);
    expect(counts.categories).toEqual([
      '국내도서-소설/시/희곡',
      '국내도서-에세이',
    ]);
  });

  it('ISBN 이 없는 수기 등록 책은 서로 합치지 않는다', () => {
    const counts = countShelf([row({ id: '1' }), row({ id: '2' })], 2026);
    expect(counts.totalBooks).toBe(2);
  });

  it('올해 권수는 완독 날짜·연도로 세고, 모르는 책은 뺀다', () => {
    const counts = countShelf(
      [
        row({ id: '1', isbn: 'A', completed_date: '2026-03-01' }),
        row({ id: '2', isbn: 'B', completed_year: 2026 }),
        row({ id: '3', isbn: 'C', completed_date: '2025-12-31' }),
        row({ id: '4', isbn: 'D' }),
      ],
      2026
    );
    expect(counts.totalBooks).toBe(4);
    expect(counts.yearBooks).toBe(2);
  });

  it('예전에 읽고 올해 다시 읽은 책은 올해 권수에 한 번 들어간다', () => {
    const counts = countShelf(
      [
        row({ id: '1', isbn: 'A', completed_date: '2019-05-01' }),
        row({ id: '2', isbn: 'A', completed_date: '2026-05-01' }),
        row({ id: '3', isbn: 'A', completed_date: '2026-09-01' }),
      ],
      2026
    );
    expect(counts.totalBooks).toBe(1);
    expect(counts.yearBooks).toBe(1);
  });
});
