import { describe, expect, it } from 'vitest';

import {
  calculateBookStats,
  filterBooksByLibraryYear,
  getBookLibraryYear,
  getCurrentLibraryYear,
  getLibraryYears,
} from './libraryPeriod';

import type { Book } from '../types';

const createBook = (overrides: Partial<Book> = {}): Book => ({
  id: crypto.randomUUID(),
  user_id: 'user-id',
  isbn: 'isbn',
  title: '테스트 책',
  author: null,
  publisher: null,
  cover_image: null,
  spine_image: null,
  description: null,
  pub_date: null,
  category: '소설',
  page_count: 100,
  toc: null,
  status: 'reading',
  read_count: 1,
  start_date: null,
  completed_date: null,
  rating: null,
  one_line_review: null,
  personal_memo: null,
  tags: null,
  is_public: true,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('libraryPeriod', () => {
  it('현재 연도는 한국 시간 기준으로 계산한다', () => {
    expect(getCurrentLibraryYear(new Date('2026-12-31T15:00:00.000Z'))).toBe(
      2027
    );
  });

  it('완독일, 시작일, 현재 연도 순서로 책장 연도를 결정한다', () => {
    expect(
      getBookLibraryYear(
        createBook({
          start_date: '2024-02-01',
          completed_date: '2025-03-01',
        }),
        2026
      )
    ).toBe(2025);

    expect(
      getBookLibraryYear(createBook({ start_date: '2024-02-01' }), 2026)
    ).toBe(2024);

    expect(getBookLibraryYear(createBook(), 2026)).toBe(2026);
  });

  it('날짜 없는 책은 현재 연도에만 보이고 해가 바뀌면 새해로 이동한다', () => {
    const undatedBook = createBook();

    expect(filterBooksByLibraryYear([undatedBook], 2026, 2026)).toEqual([
      undatedBook,
    ]);
    expect(filterBooksByLibraryYear([undatedBook], 2025, 2026)).toEqual([]);
    expect(filterBooksByLibraryYear([undatedBook], 2027, 2027)).toEqual([
      undatedBook,
    ]);
  });

  it('현재 연도와 책 기록 연도를 중복 없이 최신순으로 반환한다', () => {
    const books = [
      createBook({ completed_date: '2024-12-31' }),
      createBook({ start_date: '2025-01-01' }),
      createBook(),
    ];

    expect(getLibraryYears(books, 2026)).toEqual([2026, 2025, 2024]);
  });

  it('조회한 목록에서 선택 연도 통계를 계산한다', () => {
    const books = [
      createBook({
        status: 'completed',
        completed_date: '2026-01-15',
        rating: 5,
        page_count: 300,
      }),
      createBook(),
      createBook({
        status: 'completed',
        completed_date: '2025-01-15',
        rating: 3,
        page_count: 200,
      }),
    ];

    const stats = calculateBookStats(books, 2026, 2026);

    expect(stats.totalCompletedBooks).toBe(1);
    expect(stats.totalPages).toBe(300);
    expect(stats.completionRate).toBe(50);
    expect(stats.averageRating).toBe(5);
    expect(stats.monthlyReading[0].count).toBe(1);
  });
});
