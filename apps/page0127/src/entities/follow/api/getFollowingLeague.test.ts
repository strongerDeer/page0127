import { describe, expect, it, vi } from 'vitest';

import { getFollowingLeague } from './getFollowingLeague';

import type { SupabaseClient } from '@supabase/supabase-js';

const rows = (length: number) =>
  Array.from({ length }, (_, index) => ({
    user_id: index === 0 ? 'me' : `reader-${index}`,
    username: null,
    nickname: null,
    photo_url: null,
    library_year: 2026,
    completed_books: 0,
    total_pages: 0,
    missing_page_books: 0,
  }));

describe('리그 조회', () => {
  it('요청 대상 ID는 RPC에 전달하지 않고 로그인 세션에 맡긴다', async () => {
    const range = vi
      .fn()
      .mockResolvedValue({ data: rows(1), error: null, count: 1 });
    const order = vi.fn().mockReturnValue({ range });
    const rpc = vi.fn().mockReturnValue({ order });
    const result = await getFollowingLeague(
      { rpc } as unknown as SupabaseClient,
      'me'
    );
    expect(result.readers).toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith(
      'get_following_reading_league',
      undefined,
      { count: 'exact' }
    );
  });

  it('서버 행 제한이 요청 크기보다 작아도 전체 인원을 받은 뒤 순위를 만든다', async () => {
    const data = rows(5);
    const range = vi.fn().mockImplementation((from: number) =>
      Promise.resolve({
        data: data.slice(from, from + 2),
        error: null,
        count: 5,
      })
    );
    const rpc = vi
      .fn()
      .mockReturnValue({ order: vi.fn().mockReturnValue({ range }) });
    expect(
      (await getFollowingLeague({ rpc } as unknown as SupabaseClient, 'me'))
        .readers
    ).toHaveLength(5);
    expect(range.mock.calls.map((call) => call[0])).toEqual([0, 2, 4]);
  });

  it('실패나 일부 응답을 빈 목록으로 위장하지 않는다', async () => {
    for (const response of [
      { data: null, error: { code: 'PGRST202' }, count: null },
      { data: [], error: null, count: 1 },
      { data: rows(1), error: null, count: null },
    ]) {
      const rpc = vi.fn().mockReturnValue({
        order: vi
          .fn()
          .mockReturnValue({ range: vi.fn().mockResolvedValue(response) }),
      });
      await expect(
        getFollowingLeague({ rpc } as unknown as SupabaseClient, 'me')
      ).rejects.toThrow();
    }
  });
});
