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
  // 통계는 같은 ISBN 을 한 책의 회독으로 보고 합친다 → 기본값을 고정 문자열로
  // 두면 서로 다른 책으로 만든 픽스처가 한 권으로 뭉쳐 권수가 어긋난다.
  // 재독을 테스트하려면 isbn 을 명시적으로 같게 준다.
  isbn: crypto.randomUUID(),
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
  is_life_book: false,
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

  it('평균 평점은 평가 안 함(0)을 빼고 계산한다 (인생책도 rating은 그대로 5다)', () => {
    const books = [
      createBook({
        status: 'completed',
        completed_date: '2026-01-10',
        rating: 5,
        is_life_book: true, // 인생책 — rating 자체는 5점, is_life_book은 별도 플래그다
      }),
      createBook({
        status: 'completed',
        completed_date: '2026-02-10',
        rating: 4,
      }),
      createBook({
        status: 'completed',
        completed_date: '2026-03-10',
        rating: 0, // "평가 안 함" — 평균에서 빠진다
      }),
    ];

    const stats = calculateBookStats(books, 2026, 2026);

    // (5 + 4) / 2 = 4.5 — 0을 세면 3.0이 된다
    expect(stats.averageRating).toBe(4.5);
    expect(stats.totalCompletedBooks).toBe(3);
  });

  it('같은 책을 두 번 읽어도 통계에서는 한 권으로 센다', () => {
    const books = [
      createBook({
        isbn: '9788901234567',
        read_count: 1,
        status: 'completed',
        completed_date: '2026-01-10',
        rating: 5,
      }),
      createBook({
        isbn: '9788901234567',
        read_count: 2,
        status: 'completed',
        completed_date: '2026-06-10',
        rating: 5,
      }),
    ];

    const stats = calculateBookStats(books, 2026, 2026);

    expect(stats.totalCompletedBooks).toBe(1);
    // 월별 막대도 한 번만 서야 한다 — 1월·6월에 각각 세면 합계가 2가 된다
    expect(stats.monthlyReading.reduce((sum, m) => sum + m.count, 0)).toBe(1);
  });

  it('해가 다른 재독은 각 연도 통계에 그대로 남는다', () => {
    // 2026년에 한 번, 2027년에 한 번 읽었으면 두 해 모두 1권이어야 한다.
    // 전체 기준으로 먼저 합치면 옛 연도가 0권이 된다.
    const books = [
      createBook({
        isbn: '9788901234567',
        read_count: 1,
        status: 'completed',
        completed_date: '2026-05-10',
      }),
      createBook({
        isbn: '9788901234567',
        read_count: 2,
        status: 'completed',
        completed_date: '2027-05-10',
      }),
    ];

    expect(calculateBookStats(books, 2026, 2027).totalCompletedBooks).toBe(1);
    expect(calculateBookStats(books, 2027, 2027).totalCompletedBooks).toBe(1);
  });

  it('1회독 때만 인생책으로 꼽았어도 인생책 수에 남는다', () => {
    const books = [
      createBook({
        isbn: '9788901234567',
        read_count: 1,
        status: 'completed',
        completed_date: '2026-01-10',
        rating: 5,
        is_life_book: true,
      }),
      createBook({
        isbn: '9788901234567',
        read_count: 2,
        status: 'completed',
        completed_date: '2026-06-10',
        rating: 5,
        is_life_book: false,
      }),
    ];

    expect(calculateBookStats(books, 2026, 2026).lifeBookCount).toBe(1);
  });

  it('5점이 아닌 인생책도 평점 분포에서 빠지지 않는다', () => {
    // 인생책 버킷의 rating 은 5 로 고정돼 있다. 두 값을 모두 맞춰 찾으면
    // '4점인데 인생책'인 책이 어느 칸에도 못 들어가 분포 합이 총 권수보다 적어진다.
    // (1회독 5점 인생책 + 2회독 4점을 합치면 실제로 이 조합이 나온다)
    const books = [
      createBook({
        rating: 4,
        is_life_book: true,
        status: 'completed',
        completed_date: '2026-03-01',
      }),
    ];

    const { ratingReading } = calculateBookStats(books, null, 2026);
    const total = ratingReading.reduce((sum, item) => sum + item.count, 0);

    expect(ratingReading.find((r) => r.is_life_book)?.count).toBe(1);
    expect(total).toBe(1);
  });

  it('5점과 인생책을 다른 항목으로 센다', () => {
    // 백필 후 인생책도 rating=5 다. 평점만으로 그룹핑하면 두 항목이 합쳐진다.
    const books = [
      createBook({
        rating: 5,
        is_life_book: false,
        status: 'completed',
        completed_date: '2026-03-01',
      }),
      createBook({
        rating: 5,
        is_life_book: true,
        status: 'completed',
        completed_date: '2026-03-02',
      }),
    ];

    const { ratingReading } = calculateBookStats(books, null, 2026);

    const plainFive = ratingReading.find(
      (r) => r.rating === 5 && !r.is_life_book
    );
    const lifeBook = ratingReading.find((r) => r.is_life_book);

    expect(plainFive?.count).toBe(1);
    expect(lifeBook?.count).toBe(1);
  });
});
