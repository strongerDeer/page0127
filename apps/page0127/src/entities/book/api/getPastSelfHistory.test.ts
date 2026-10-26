import { describe, expect, it, vi } from 'vitest';

import { getPastSelfHistory } from './getPastSelfHistory';

import type { SupabaseClient } from '@supabase/supabase-js';

const book = (id: string) => ({
  id,
  user_id: 'me',
  isbn: null,
  status: 'completed',
  is_public: true,
  completed_date: '2026-10-01',
  completed_year: null,
  created_at: '2026-10-01T00:00:00Z',
  read_count: 1,
  is_life_book: false,
  page_count: 100,
});
const mock = (pages: unknown[]) => {
  const range = vi.fn();
  pages.forEach((page) => range.mockResolvedValueOnce(page));
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range,
  };
  const from = vi.fn(() => query);
  return { client: { from } as unknown as SupabaseClient, query, range, from };
};
describe('getPastSelfHistory', () => {
  it('본인 공개 완독만 조회하고 실제 반환 수로 다음 페이지를 읽는다', async () => {
    const { client, query, range } = mock([
      { data: [book('a')], count: 2, error: null },
      { data: [book('b')], count: 2, error: null },
    ]);
    expect(
      (await getPastSelfHistory(client, 'me', '2026-10-26')).month.current
        .completedBooks
    ).toBe(2);
    expect(query.eq.mock.calls).toContainEqual(['user_id', 'me']);
    expect(query.eq.mock.calls).toContainEqual(['is_public', true]);
    expect(query.eq.mock.calls).toContainEqual(['status', 'completed']);
    expect(range.mock.calls).toEqual([
      [0, 249],
      [1, 250],
    ]);
  });
  it('권한·네트워크 오류를 0권으로 바꾸지 않는다', async () => {
    await expect(
      getPastSelfHistory(
        mock([{ data: null, count: null, error: { message: 'denied' } }])
          .client,
        'me',
        '2026-10-26'
      )
    ).rejects.toThrow('불러오지');
  });
  it('도중에 건수가 바뀌거나 일부가 누락되면 재시도한다', async () => {
    for (const second of [
      { data: [book('b')], count: 3, error: null },
      { data: [], count: 2, error: null },
    ]) {
      await expect(
        getPastSelfHistory(
          mock([{ data: [book('a')], count: 2, error: null }, second]).client,
          'me',
          '2026-10-26'
        )
      ).rejects.toThrow();
    }
  });
  it('중복 페이지를 정상 전체 기록으로 표시하지 않는다', async () => {
    await expect(
      getPastSelfHistory(
        mock([
          { data: [book('a')], count: 2, error: null },
          { data: [book('a')], count: 2, error: null },
        ]).client,
        'me',
        '2026-10-26'
      )
    ).rejects.toThrow('변경');
  });
});
