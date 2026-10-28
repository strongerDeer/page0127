import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap from './sitemap';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@/shared/config/supabase/server', () => ({ createClient }));

beforeEach(() => vi.resetAllMocks());

describe('sitemap', () => {
  it('DB 장애에도 공개 정적 주소는 유지하고 로그인·이동된 주소는 제외한다', async () => {
    createClient.mockRejectedValue(new Error('DB unavailable'));

    const paths = (await sitemap()).map(({ url }) => new URL(url).pathname);

    expect(paths).toEqual([
      '/',
      '/books/all',
      '/updates',
      '/contact',
      '/privacy',
      '/terms',
    ]);
  });

  it('책 정보와 공개 책이 있는 서재의 검색용 URL을 유지한다', async () => {
    const publicOnly = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [{ user_id: 'owner-1' }] }),
    });
    const owners = vi.fn().mockReturnValue({
      not: vi.fn().mockResolvedValue({
        data: [
          { username: 'reader', updated_at: '2026-10-20' },
          { username: null, updated_at: null },
        ],
      }),
    });
    createClient.mockResolvedValue({
      from: (table: string) => ({
        select: () => {
          if (table === 'global_books') {
            return {
              order: () => ({
                limit: async () => ({
                  data: [{ id: 'book-1', created_at: '2026-10-20' }],
                }),
              }),
            };
          }
          if (table === 'books') return { eq: publicOnly };
          if (table === 'profiles') return { in: owners };
          throw new Error(`Unexpected table: ${table}`);
        },
      }),
    });

    const paths = (await sitemap()).map(({ url }) => new URL(url).pathname);

    expect(paths).toContain('/books/info/book-1');
    expect(paths).toContain('/reader');
    expect(paths).not.toContain('/null');
    expect(paths).not.toContain('/login');
    expect(publicOnly).toHaveBeenCalledWith('is_public', true);
    expect(owners).toHaveBeenCalledWith('id', ['owner-1']);
  });
});
