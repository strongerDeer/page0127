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
  it('직접 등록 도서가 offset 보다 적어도(PGRST103) 2페이지 서점 결과를 돌려준다', async () => {
    // 실제 운영 버그(2026-11-20): 직접 등록 도서 0권 + page=2 → offset 10 → 416 → 검색 전체 500
    mocks.search.mockResolvedValue({
      items: [{ isbn: '9788936811853', title: '2페이지 책' }],
      totalResults: 24,
      page: 2,
    });
    mocks.range.mockResolvedValue({
      data: null,
      count: null,
      error: {
        code: 'PGRST103',
        message: 'Requested range not satisfiable',
      },
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await GET(
      new NextRequest('http://localhost/api/books/search?query=책&page=2')
    );
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(2);
    expect(result.catalogItems).toEqual([]);
    // 정상 상황이라 에러 로그도 남기지 않는다
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it('직접 등록 도서 조회가 실패해도 서점 결과는 돌려준다', async () => {
    mocks.search.mockResolvedValue({
      items: [{ isbn: '9788936434120', title: '서점 책' }],
      totalResults: 1,
      page: 1,
    });
    mocks.range.mockResolvedValue({
      data: null,
      count: null,
      error: { code: '57014', message: 'statement timeout' },
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await GET(
      new NextRequest('http://localhost/api/books/search?query=책')
    );
    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(1);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
  it('서점과 직접 등록 도서가 모두 실패하면 500', async () => {
    mocks.search.mockRejectedValue(new Error('provider down'));
    mocks.range.mockResolvedValue({
      data: null,
      count: null,
      error: { code: '57014', message: 'statement timeout' },
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await GET(
      new NextRequest('http://localhost/api/books/search?query=책')
    );
    expect(response.status).toBe(500);
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
