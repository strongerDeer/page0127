import { describe, expect, it } from 'vitest';

import { toGoalReachedDate, toGoalStoryProps } from './goalStory';

import type { ReaderShareData } from '../api/getReaderShareData';
import type { PublicShelfBook } from '@/entities/book/api/getPublicShelfSummary';

const book = (
  id: string,
  completed_date: string | null,
  completed_year: number | null = null
): PublicShelfBook => ({
  id,
  isbn: id,
  title: `책 ${id}`,
  cover_image: `https://img/${id}/cover`,
  spine_image: null,
  thickness_mm: 20,
  is_life_book: false,
  rating: 4,
  completed_date,
  completed_year,
});

// 최신순 — getPublicShelfSummary 와 같은 순서
const BOOKS = [
  book('d', '2026-10-12'),
  book('c', '2026-06-01'),
  book('b', '2026-03-15'),
  book('old', '2025-12-30'),
];

const data = (over: Partial<ReaderShareData> = {}): ReaderShareData => ({
  displayName: '혜진',
  photoUrl: null,
  readingGoal: { year: 2026, target: 3 },
  topics: ['관계'],
  year: 2026,
  yearBooks: 3,
  totalBooks: 4,
  covers: [],
  books: BOOKS,
  card: { identity: null, stat: null },
  ...over,
});

describe('toGoalReachedDate', () => {
  it('그 해 책을 날짜순으로 세워 목표 권수째 책의 완독일', () => {
    expect(toGoalReachedDate(BOOKS, 2026, 2)).toBe('6월 1일');
    expect(toGoalReachedDate(BOOKS, 2026, 3)).toBe('10월 12일');
  });

  it('아직 못 채웠으면 null', () => {
    expect(toGoalReachedDate(BOOKS, 2026, 4)).toBeNull();
  });

  it('연도만 아는 책이 그 해에 있으면 null — 몇 번째 책인지 정할 수 없다', () => {
    expect(
      toGoalReachedDate([...BOOKS, book('y', null, 2026)], 2026, 2)
    ).toBeNull();
    // 다른 해의 연도만 아는 책은 상관없다
    expect(toGoalReachedDate([...BOOKS, book('y', null, 2019)], 2026, 2)).toBe(
      '6월 1일'
    );
  });
});

describe('toGoalStoryProps', () => {
  it('목표를 채우면 목표·권수·달성일을 그린다', () => {
    const props = toGoalStoryProps(data(), 'hyejin', 'https://page0127.com');
    expect(props).toMatchObject({
      address: 'page0127.com/hyejin',
      label: '2026 독서 목표 달성',
      headline: '목표 3권,\n다 읽었어요!',
      topics: [],
      count: { label: '2026년에 완독한 책', value: 3 },
      note: '목표 3권 · 10월 12일 달성',
    });
  });

  it('표지는 올해 책만 — 숫자와 같은 책이어야 한다', () => {
    const props = toGoalStoryProps(data(), 'hyejin', undefined);
    expect(props?.covers).toEqual([
      'https://img/d/cover',
      'https://img/c/cover',
      'https://img/b/cover',
    ]);
  });

  it('달성일을 모르면 목표만 적는다', () => {
    const props = toGoalStoryProps(
      data({ books: [...BOOKS, book('y', null, 2026)], yearBooks: 4 }),
      'hyejin',
      undefined
    );
    expect(props?.note).toBe('목표 3권 달성');
  });

  it('못 채웠거나·목표가 없거나·지난해 목표면 null — "달성"을 지어내지 않는다', () => {
    expect(toGoalStoryProps(data({ yearBooks: 2 }), 'a', undefined)).toBeNull();
    expect(
      toGoalStoryProps(data({ readingGoal: null }), 'a', undefined)
    ).toBeNull();
    expect(
      toGoalStoryProps(
        data({ readingGoal: { year: 2025, target: 1 } }),
        'a',
        undefined
      )
    ).toBeNull();
    expect(
      toGoalStoryProps(
        data({ readingGoal: { year: 2026, target: 0 } }),
        'a',
        undefined
      )
    ).toBeNull();
  });
});
