import { describe, expect, it } from 'vitest';

import { type BookReaderRow, pickBookReaders } from './bookReaders';

const row = (
  userId: string,
  status: BookReaderRow['status']
): BookReaderRow => ({ user_id: userId, status });

describe('pickBookReaders', () => {
  it('들어온 순서(최근 기록 순)를 지킨다', () => {
    const { readers } = pickBookReaders(
      [row('a', 'reading'), row('b', 'completed'), row('c', 'reading')],
      10
    );
    expect(readers.map((r) => r.userId)).toEqual(['a', 'b', 'c']);
  });

  it('재독으로 같은 사람이 여러 번 나오면 한 번만, 완독을 우선한다', () => {
    // 최근 행은 '읽는 중'(다시 읽기)이지만 이미 완독한 사람이다
    const { readers, total } = pickBookReaders(
      [row('a', 'reading'), row('b', 'reading'), row('a', 'completed')],
      10
    );
    expect(readers).toEqual([
      { userId: 'a', status: 'completed' },
      { userId: 'b', status: 'reading' },
    ]);
    expect(total).toBe(2);
  });

  it('읽고 싶은 책(want_to_read)은 "읽은" 리더가 아니므로 뺀다', () => {
    const { readers, total } = pickBookReaders(
      [row('a', 'want_to_read'), row('b', 'completed')],
      10
    );
    expect(readers.map((r) => r.userId)).toEqual(['b']);
    expect(total).toBe(1);
  });

  it('max 까지만 돌려주고 total 은 전체 사람 수다', () => {
    const rows = ['a', 'b', 'c', 'd'].map((id) => row(id, 'completed'));
    const { readers, total } = pickBookReaders(rows, 2);
    expect(readers.map((r) => r.userId)).toEqual(['a', 'b']);
    expect(total).toBe(4);
  });

  it('행이 없으면 빈 목록과 0', () => {
    expect(pickBookReaders([], 10)).toEqual({ readers: [], total: 0 });
  });
});
