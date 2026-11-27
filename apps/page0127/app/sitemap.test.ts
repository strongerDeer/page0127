import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap from './sitemap';

const { createClient, getPublishedStories } = vi.hoisted(() => ({
  createClient: vi.fn(),
  getPublishedStories: vi.fn(),
}));
vi.mock('@/shared/config/supabase/server', () => ({ createClient }));
vi.mock('@/entities/story/server', () => ({ getPublishedStories }));

const STORY = {
  id: 'story-1',
  slug: 'daeonsil-repair-report',
  bookId: 'book-1',
  bookTitle: '대온실 수리 보고서',
  author: '김금희',
  title: '대온실 수리 보고서 독후감과 인물관계도',
  description: '',
  rating: 0,
  mapImage: {
    src: '/images/stories/daeonsil/character-map.webp',
    width: 1024,
    height: 1536,
    alt: '인물관계도',
  },
  publishedAt: '2026-11-23T00:00:00Z',
  updatedAt: '2026-11-23T00:00:00Z',
};

beforeEach(() => {
  vi.resetAllMocks();
  getPublishedStories.mockResolvedValue([STORY]);
});

describe('sitemap', () => {
  it('DB 장애에도 공개 정적 주소는 유지하고 로그인·이동된 주소는 제외한다', async () => {
    createClient.mockRejectedValue(new Error('DB unavailable'));

    const paths = (await sitemap()).map(({ url }) => new URL(url).pathname);

    expect(paths).toEqual([
      '/',
      '/books/all',
      '/about',
      '/sentence',
      '/typing/little-prince',
      '/updates',
      '/contact',
      '/privacy',
      '/terms',
      '/blog',
      '/blog/daeonsil-repair-report',
    ]);
  });

  it('책 이야기 주소에 인물관계도 이미지를 절대 주소로 함께 알린다', async () => {
    createClient.mockRejectedValue(new Error('DB unavailable'));

    const story = (await sitemap()).find(({ url }) =>
      url.endsWith('/blog/daeonsil-repair-report')
    );

    expect(story?.images?.[0]).toMatch(
      /^https?:\/\/.+\/images\/stories\/daeonsil\/character-map\.webp$/
    );
  });

  it('공개한 책 이야기가 없거나 조회에 실패하면 /blog 를 알리지 않는다', async () => {
    createClient.mockRejectedValue(new Error('DB unavailable'));
    getPublishedStories.mockRejectedValue(new Error('stories down'));

    const paths = (await sitemap()).map(({ url }) => new URL(url).pathname);

    expect(paths.some((path) => path.startsWith('/blog'))).toBe(false);
  });

  it('책 정보와 공개 책이 있는 서재의 검색용 URL을 유지한다', async () => {
    // book-1: 리더 2명 → 색인 / book-2: 리더 1명 → 제외 / book-3: 리더 0명이지만 "이 책에 남긴 말" 댓글 → 색인
    const publicOnly = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({
        data: [
          { user_id: 'owner-1', isbn: 'isbn-1', status: 'completed' },
          { user_id: 'owner-2', isbn: 'isbn-1', status: 'reading' },
          { user_id: 'owner-1', isbn: 'isbn-2', status: 'completed' },
        ],
      }),
    });
    // 검색 노출을 끈 서재는 DB 조건(search_indexable = true)으로 빠진다
    const indexableOnly = vi.fn().mockResolvedValue({
      data: [
        { username: 'reader', updated_at: '2026-10-20' },
        { username: null, updated_at: null },
      ],
    });
    const owners = vi.fn().mockReturnValue({
      not: vi.fn().mockReturnValue({ eq: indexableOnly }),
    });
    createClient.mockResolvedValue({
      from: (table: string) => ({
        select: () => {
          if (table === 'global_books') {
            // 승인된 서점 책만 — 직접 등록 책은 등록한 사람에게만 보이므로 뺀다
            const order = () => ({
              limit: async () => ({
                data: [
                  { id: 'book-1', isbn: 'isbn-1', created_at: '2026-10-20' },
                  { id: 'book-2', isbn: 'isbn-2', created_at: '2026-10-20' },
                  { id: 'book-3', isbn: 'isbn-3', created_at: '2026-10-20' },
                ],
              }),
            });
            return {
              eq: (column: string, value: string) => {
                expect([column, value]).toEqual(['review_status', 'approved']);
                return {
                  or: (filter: string) => {
                    expect(filter).toBe('source.is.null,source.neq.manual');
                    return { order };
                  },
                };
              },
            };
          }
          if (table === 'books') return { eq: publicOnly };
          if (table === 'book_comments')
            return {
              not: () => ({
                limit: async () => ({ data: [{ global_book_id: 'book-3' }] }),
              }),
            };
          if (table === 'profiles') return { in: owners };
          throw new Error(`Unexpected table: ${table}`);
        },
      }),
    });

    const paths = (await sitemap()).map(({ url }) => new URL(url).pathname);

    expect(paths).toContain('/books/info/book-1');
    expect(paths).not.toContain('/books/info/book-2');
    expect(paths).toContain('/books/info/book-3');
    expect(paths).toContain('/reader');
    expect(paths).not.toContain('/null');
    expect(paths).not.toContain('/login');
    expect(publicOnly).toHaveBeenCalledWith('is_public', true);
    expect(owners).toHaveBeenCalledWith('id', ['owner-1', 'owner-2']);
    expect(indexableOnly).toHaveBeenCalledWith('search_indexable', true);
  });
});
