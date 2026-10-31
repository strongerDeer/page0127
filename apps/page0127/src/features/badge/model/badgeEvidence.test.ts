import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { getBadgeEvidence } from './badgeEvidence';
import { computeBadges } from './badges';

import type { BadgeId } from './badges';
import type { Book } from '@/entities/book';

const evidenceFor = (books: Book[], id: BadgeId) => {
  const input = { books, readingGoal: null, firstTasteAnalysisAt: null };
  return getBadgeEvidence(
    computeBadges(input).find((badge) => badge.id === id)!,
    input
  );
};
const classics = () =>
  Array.from({ length: 6 }, (_, i) =>
    createTestBook({
      id: `classic-${i}`,
      isbn: `classic-isbn-${i}`,
      title: `고전 ${i + 1}`,
      category: '고전',
      completed_date: `2024-01-0${i + 1}`,
    })
  );

describe('배지 집계 근거', () => {
  it('5권 달성의 마지막 한 권뿐 아니라 집계된 6권 전체와 달성 경계를 준다', () => {
    const books = classics();
    const evidence = evidenceFor([...books].reverse(), 'classics')!;
    expect(evidence.books.map((book) => book.title)).toEqual(
      books.map((book) => book.title)
    );
    expect(evidence.milestone).toEqual({ count: 5, label: '5권' });
    expect(evidence.books[4]).toMatchObject({
      id: 'classic-4',
      completedAt: '2024-01-05',
    });
  });
  it('재독은 첫 완독 한 권으로 세고 미완독·비공개 기록을 노출하지 않는다', () => {
    const books = classics();
    const repeat = { ...books[0]!, id: 'repeat', completed_date: '2026-10-25' };
    const secret = createTestBook({
      is_public: false,
      title: '비공개 책',
      category: '고전',
    });
    const reading = createTestBook({ status: 'reading', category: '고전' });
    const evidence = evidenceFor(
      [...books, repeat, secret, reading],
      'classics'
    )!;
    expect(evidence.books).toHaveLength(6);
    expect(evidence.books.map((book) => book.id)).not.toContain('repeat');
    expect(evidence.books.some((book) => book.title === '비공개 책')).toBe(
      false
    );
  });
  it('분야별 배지는 해당 분야만, 넓은 시야는 각 분야의 첫 책을 보여 준다', () => {
    const books = [
      createTestBook({
        title: '과학 첫 책',
        category: '과학',
        completed_date: '2026-01-01',
      }),
      createTestBook({
        title: '과학 두 번째',
        category: '과학',
        completed_date: '2026-01-02',
      }),
      createTestBook({
        title: '인문 첫 책',
        category: '인문학',
        completed_date: '2026-01-03',
      }),
    ];
    expect(
      evidenceFor(books, 'science')?.books.map((book) => book.title)
    ).toEqual(['과학 첫 책', '과학 두 번째']);
    const wide = evidenceFor(books, 'wide-view')!;
    expect(wide.books.map((book) => book.detail)).toEqual([
      '과학/IT',
      '인문학',
    ]);
    expect(wide.milestone).toEqual({ count: 2, label: '2분야' });
  });
  it('미획득 히든과 책이 아닌 방문 배지는 책 근거를 제공하지 않는다', () => {
    expect(evidenceFor(classics(), 'double-finish')).toBeUndefined();
    expect(evidenceFor(classics(), 'regular')).toBeUndefined();
  });
  it('완독일 미기록을 등록일로 바꿔 표시하지 않는다', () => {
    const result = evidenceFor(
      [createTestBook({ category: '고전', completed_date: null })],
      'classics'
    )!;
    expect(result.books[0]!.completedAt).toBeNull();
  });
});

describe('이야기 배지의 여러 기록', () => {
  it('작가 덕질은 달성한 작가의 서로 다른 책만 보여 준다', () => {
    const books = Array.from({ length: 3 }, (_, i) =>
      createTestBook({
        author: '같은 작가',
        completed_date: `2026-01-0${i + 1}`,
      })
    );
    books.push(
      createTestBook({ author: '다른 작가', completed_date: '2026-01-04' })
    );
    const evidence = evidenceFor(books, 'author-fan')!;
    expect(evidence.books).toHaveLength(3);
    expect(evidence.milestone).toEqual({ count: 3, label: '3권' });
  });
  it('한줄평은 같은 책의 서로 다른 회독에 남긴 평도 기록별로 보여 준다', () => {
    const books = [
      createTestBook({
        isbn: 'same',
        one_line_review: '첫 번째 평',
        completed_date: '2025-01-01',
      }),
      createTestBook({
        isbn: 'same',
        one_line_review: '다시 읽은 평',
        completed_date: '2026-01-01',
      }),
    ];
    expect(evidenceFor(books, 'critic')?.books).toHaveLength(2);
  });
  it('연간 목표의 집계 근거에는 목표 해의 완독만 포함한다', () => {
    const books = [
      createTestBook({ completed_date: '2025-01-01' }),
      createTestBook({ completed_date: '2026-01-01' }),
      createTestBook({ completed_date: '2026-01-02' }),
    ];
    const input = {
      books,
      readingGoal: { year: 2026, target: 2 },
      firstTasteAnalysisAt: null,
    };
    const badge = computeBadges(input).find((item) => item.id === 'goal-kept')!;
    expect(
      getBadgeEvidence(badge, input)?.books.map((book) => book.completedAt)
    ).toEqual(['2026-01-01', '2026-01-02']);
  });
});
