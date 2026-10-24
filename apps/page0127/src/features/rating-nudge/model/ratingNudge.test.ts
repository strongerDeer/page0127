import { describe, expect, it } from 'vitest';

import {
  pickUnratedCompleted,
  toLockedAnalysisMessage,
  toRatingNudge,
} from './ratingNudge';

import type { Book } from '@/entities/book';

const book = (over: Partial<Book>): Book =>
  ({
    id: 'id',
    title: '책',
    author: null,
    status: 'completed',
    rating: null,
    created_at: '2026-10-01T00:00:00Z',
    ...over,
  }) as Book;

describe('pickUnratedCompleted', () => {
  it('별점 없는 완독 책만 최근에 담은 순서로 고른다', () => {
    const result = pickUnratedCompleted([
      book({ id: 'old', created_at: '2026-01-01T00:00:00Z' }),
      book({ id: 'rated', rating: 4 }),
      book({ id: 'zero', rating: 0 }),
      book({ id: 'reading', status: 'reading' }),
      book({ id: 'new', created_at: '2026-10-20T00:00:00Z' }),
    ]);
    expect(result.map((b) => b.id)).toEqual(['new', 'old']);
  });
});

describe('toRatingNudge', () => {
  it('취향 분석이 이미 열렸으면 보이지 않는다', () => {
    expect(
      toRatingNudge({ analyzableCount: 5, unratedCount: 3, minBooks: 5 })
    ).toBeNull();
  });

  it('별점 없는 완독 책이 없으면 보이지 않는다', () => {
    expect(
      toRatingNudge({ analyzableCount: 2, unratedCount: 0, minBooks: 5 })
    ).toBeNull();
  });

  it('잠겨 있고 별점 없는 책이 있으면 남은 권수와 함께 보인다', () => {
    expect(
      toRatingNudge({ analyzableCount: 2, unratedCount: 8, minBooks: 5 })
    ).toEqual({ needed: 3, unratedCount: 8 });
  });
});

describe('toLockedAnalysisMessage', () => {
  it('안내할 게 없으면 원래 문구를 쓴다', () => {
    expect(toLockedAnalysisMessage(null, '기본')).toBe('기본');
  });

  it('별점만으로 채울 수 있으면 그만큼만 말한다', () => {
    expect(
      toLockedAnalysisMessage({ needed: 3, unratedCount: 8 }, '기본')
    ).toBe('완독 책 3권에 별점만 남기면 바로 취향 분석을 볼 수 있어요.');
  });

  it('별점만으로 모자라면 더 읽어야 할 권수도 말한다', () => {
    expect(
      toLockedAnalysisMessage({ needed: 4, unratedCount: 1 }, '기본')
    ).toBe(
      '별점 없는 완독 책 1권에 별점을 남기고, 3권을 더 읽으면 취향 분석을 볼 수 있어요.'
    );
  });
});
