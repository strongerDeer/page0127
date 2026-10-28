import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  eq: vi.fn(),
  range: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/shared/api/book-provider', () => ({
  getBookProvider: () => ({ search: mocks.search }),
}));
vi.mock('../../_helpers/auth', () => ({
  getSupabaseClient: async () => ({ from: mocks.from }),
}));
import { GET } from './route';
beforeEach(() => {
  vi.resetAllMocks();
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: mocks.eq.mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: mocks.range,
  };
  mocks.from.mockReturnValue(query);
  mocks.search.mockResolvedValue({ items: [], totalResults: 0, page: 1 });
  mocks.range.mockResolvedValue({
    data: [
      {
        isbn: 'manual:a',
        title: '책',
        author: '저자',
        publisher: null,
        source_url: null,
      },
    ],
    count: 12,
    error: null,
  });
});
describe('승인된 직접 등록 도서 검색', () => {
  it('승인된 수동 도서만 별도 결과와 건수로 돌려준다', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/books/search?query=책')
    );
    const result = await response.json();
    expect(mocks.eq).toHaveBeenCalledWith('review_status', 'approved');
    expect(mocks.eq).toHaveBeenCalledWith('source', 'manual');
    expect(result.catalogTotalResults).toBe(12);
    expect(result.catalogItems[0]).toMatchObject({
      source: 'manual',
      title: '책',
      coverImage: '',
    });
  });
  it('서점 API가 실패해도 승인된 도서는 검색할 수 있다', async () => {
    mocks.search.mockRejectedValue(new Error('provider down'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await GET(
      new NextRequest('http://localhost/api/books/search?query=책')
    );
    expect(response.status).toBe(200);
    expect((await response.json()).catalogItems).toHaveLength(1);
    log.mockRestore();
  });
  it('공백 검색어는 공급자 호출 전에 거절한다', async () => {
    expect(
      (
        await GET(
          new NextRequest('http://localhost/api/books/search?query=%20')
        )
      ).status
    ).toBe(400);
    expect(mocks.search).not.toHaveBeenCalled();
  });
});
