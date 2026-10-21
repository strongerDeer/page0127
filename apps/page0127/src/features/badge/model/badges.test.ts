import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { computeBadges, normalizeAuthor } from './badges';

import type { BadgeId, BadgeInput } from './badges';
import type { Book } from '@/entities/book';

const done = (date: string, overrides: Partial<Book> = {}) =>
  createTestBook({
    completed_date: date,
    created_at: `${date}T09:00:00Z`,
    ...overrides,
  });

const run = (books: Book[], extra: Partial<BadgeInput> = {}) =>
  computeBadges({
    books,
    readingGoal: null,
    firstTasteAnalysisAt: null,
    ...extra,
  });

const find = (books: Book[], id: BadgeId, extra?: Partial<BadgeInput>) =>
  run(books, extra).find((badge) => badge.id === id)!;

describe('computeBadges', () => {
  it('책이 없으면 아무 뱃지도 받지 않고, 책장은 첫 권까지 진행도를 보여 준다', () => {
    const badges = run([]);
    expect(badges.every((badge) => !badge.earned)).toBe(true);
    expect(badges.find((b) => b.id === 'shelf')!.progress).toEqual({
      current: 0,
      target: 1,
    });
  });

  describe('책장 (성장)', () => {
    it('10권째 완독에서 2단계가 되고, 그 10번째 책으로 받는다', () => {
      const books = Array.from({ length: 12 }, (_, i) =>
        done(`2026-01-${String(i + 1).padStart(2, '0')}`, {
          title: `책${i + 1}`,
        })
      );
      const shelf = find(books, 'shelf');
      expect(shelf.level).toBe(2);
      expect(shelf.book?.title).toBe('책10');
      expect(shelf.earnedAt).toBe('2026-01-10');
      expect(shelf.progress).toEqual({ current: 12, target: 50 });
    });

    it('재독은 한 권으로 센다', () => {
      const isbn = 'same';
      const books = [
        done('2026-01-01', { isbn }),
        done('2026-02-01', { isbn, read_count: 2 }),
      ];
      expect(find(books, 'shelf').progress).toEqual({ current: 1, target: 10 });
    });

    it('읽는 중·읽고 싶은 책은 세지 않는다', () => {
      const books = [
        createTestBook({ status: 'reading' }),
        createTestBook({ status: 'want_to_read' }),
      ];
      expect(find(books, 'shelf').earned).toBe(false);
    });
  });

  it('넓은 시야: 분류 불명은 빼고 서로 다른 분야 3개에서 받는다', () => {
    const books = [
      done('2026-01-01', { category: '국내도서>소설/시/희곡>한국소설' }),
      done('2026-01-02', { category: '국내도서>인문학>철학' }),
      done('2026-01-03', { category: null }),
      done('2026-01-04', {
        category: '국내도서>과학>물리학',
        title: '세 번째',
      }),
    ];
    const wide = find(books, 'wide-view');
    expect(wide.level).toBe(1);
    expect(wide.book?.title).toBe('세 번째');
  });

  it('단숨에: 시작일과 완독일이 같아야 하고, 시작일이 없으면 받지 않는다', () => {
    expect(find([done('2026-03-01')], 'one-sitting').earned).toBe(false);
    expect(
      find([done('2026-03-01', { start_date: '2026-03-01' })], 'one-sitting')
        .earned
    ).toBe(true);
  });

  it('작가 덕질: 역할 표기가 달라도 같은 작가 3권이면 받는다', () => {
    const books = [
      done('2026-01-01', { author: '헤르만 헤세 (지은이), 전영애 (옮긴이)' }),
      done('2026-01-02', { author: '헤르만 헤세' }),
      done('2026-01-03', { author: '헤르만 헤세 (지은이)', title: '싯다르타' }),
    ];
    const fan = find(books, 'author-fan');
    expect(fan.earned).toBe(true);
    expect(fan.book?.title).toBe('싯다르타');
    expect(find(books.slice(0, 2), 'author-fan').progress).toEqual({
      current: 2,
      target: 3,
    });
  });

  it('드디어!: 등록하고 1년 뒤 완독해야 한다 (지난 책을 오늘 등록한 건 아니다)', () => {
    const late = createTestBook({
      created_at: '2025-01-01T00:00:00Z',
      completed_date: '2026-02-01',
    });
    const backfilled = createTestBook({
      created_at: '2026-10-21T00:00:00Z',
      completed_date: '2020-01-01',
    });
    expect(find([late], 'finally').earned).toBe(true);
    expect(find([backfilled], 'finally').earned).toBe(false);
  });

  it('약속 지킴: 목표 해의 완독이 목표 권수를 채운 날 받는다', () => {
    const books = [
      done('2025-12-31'),
      done('2026-01-05'),
      done('2026-02-05', { title: '두 번째' }),
    ];
    const goal = find(books, 'goal-kept', {
      readingGoal: { year: 2026, target: 2 },
    });
    expect(goal.earnedAt).toBe('2026-02-05');
    expect(goal.book?.title).toBe('두 번째');
    expect(
      find(books, 'goal-kept', { readingGoal: { year: 2026, target: 3 } })
        .earned
    ).toBe(false);
  });

  it('나를 알다: 첫 취향 분석 시각으로 받고 책은 없다', () => {
    const badge = find([], 'know-yourself', {
      firstTasteAnalysisAt: '2026-05-01T10:00:00Z',
    });
    expect(badge.earned).toBe(true);
    expect(badge.book).toBeNull();
  });

  it('히든: 0127·새해·더블 피니시·솔직한 독자', () => {
    const books = [
      done('2026-01-27', { title: '0127책' }),
      done('2026-01-01'),
      done('2026-03-03', { rating: 1 }),
      done('2026-03-03'),
    ];
    const badges = run(books);
    const earned = new Set(badges.filter((b) => b.earned).map((b) => b.id));
    expect(earned).toEqual(
      new Set([
        'shelf',
        'day-0127',
        'new-year',
        'double-finish',
        'honest',
        'book-about-books',
      ])
    );
    expect(badges.find((b) => b.id === 'day-0127')!.book?.title).toBe('0127책');
  });

  it('더블 피니시: 같은 책 회독 두 번은 두 권이 아니다', () => {
    const isbn = 'same';
    const books = [
      done('2026-03-03', { isbn }),
      done('2026-03-03', { isbn, read_count: 2 }),
    ];
    expect(find(books, 'double-finish').earned).toBe(false);
  });

  it('신간 사냥꾼: 출간 후 한 달 안, 출간 전 날짜는 아니다', () => {
    expect(
      find([done('2026-05-20', { pub_date: '2026-05-01' })], 'new-release')
        .earned
    ).toBe(true);
    expect(
      find([done('2026-08-20', { pub_date: '2026-05-01' })], 'new-release')
        .earned
    ).toBe(false);
  });
});

describe('normalizeAuthor', () => {
  it('첫 사람만, 역할 표기를 떼고 돌려준다', () => {
    expect(normalizeAuthor('한강 (지은이)')).toBe('한강');
    expect(normalizeAuthor('A, B')).toBe('A');
    expect(normalizeAuthor('  ')).toBeNull();
    expect(normalizeAuthor(null)).toBeNull();
  });
});
