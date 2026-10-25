import { describe, expect, it } from 'vitest';

import { parseFollowingLeague } from './readingLeague';

const row = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'me',
  username: 'my-library',
  nickname: null,
  photo_url: null,
  library_year: 2026,
  completed_books: '0',
  total_pages: '0',
  missing_page_books: '0',
  ...overrides,
});

describe('리그 RPC 응답', () => {
  it('실제 0권은 보존하고 숫자 문자열도 같은 집계로 읽는다', () => {
    expect(parseFollowingLeague([row()], 'me')).toEqual({
      year: 2026,
      readers: [
        {
          userId: 'me',
          username: 'my-library',
          nickname: null,
          photoUrl: null,
          completedBooks: 0,
          totalPages: 0,
          missingPageBooks: 0,
        },
      ],
    });
  });

  it('본인이 없는 응답·중복·서로 다른 연도는 0권으로 바꾸지 않는다', () => {
    for (const rows of [
      [],
      [row({ user_id: 'other' })],
      [row(), row()],
      [row(), row({ user_id: 'other', library_year: 2025 })],
    ]) {
      expect(() => parseFollowingLeague(rows, 'me')).toThrow();
    }
  });

  it('누락된 숫자나 유효하지 않은 집계는 표시하지 않는다', () => {
    for (const value of [
      null,
      undefined,
      -1,
      '12권',
      '',
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() =>
        parseFollowingLeague([row({ total_pages: value })], 'me')
      ).toThrow();
    }
  });
});
