import { describe, expect, it } from 'vitest';

import { battleState, rankReaders } from './readingLeague';

import type { LeagueReader } from './readingLeague';

const reader = (id: string, books: number, pages: number): LeagueReader => ({
  userId: id,
  username: id,
  nickname: id,
  photoUrl: null,
  completedBooks: books,
  totalPages: pages,
  missingPageBooks: 0,
});

describe('리그 순위와 배틀 비율', () => {
  it('0을 포함해 같은 지표는 공동 순위 1,1,3으로 비교한다', () => {
    const readers = [
      reader('가', 3, 100),
      reader('나', 3, 200),
      reader('다', 1, 0),
      reader('라', 0, 0),
    ];
    expect(rankReaders(readers, 'books').map((r) => r.rank)).toEqual([
      1, 1, 3, 4,
    ]);
    expect(
      rankReaders(readers, 'pages').map((r) => [r.userId, r.rank])
    ).toEqual([
      ['나', 1],
      ['가', 2],
      ['다', 3],
      ['라', 3],
    ]);
    expect(readers[0].userId).toBe('가');
  });

  it('게이지는 합계 비율이며 0과 동점에도 유효하다', () => {
    expect(battleState(12, 18)).toMatchObject({
      share: 40,
      gap: 6,
      leading: 'other',
      close: false,
    });
    expect(battleState(12, 14).close).toBe(true);
    expect(battleState(18, 12).leading).toBe('me');
    expect(battleState(0, 0)).toMatchObject({
      share: 50,
      tied: true,
      close: false,
    });
    expect(battleState(0, 5).share).toBe(0);
    expect(battleState(5, 0).share).toBe(100);
  });
});
