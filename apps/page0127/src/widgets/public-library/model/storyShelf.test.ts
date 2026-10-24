import { describe, expect, it } from 'vitest';

import {
  STORY_SHELF_MAX_BOOKS,
  STORY_SHELF_MIN_BOOKS,
  toStoryShelf,
} from './storyShelf';

import type { PublicShelfBook } from '@/entities/book/api/getPublicShelfSummary';

const book = (
  id: string,
  over: Partial<PublicShelfBook> = {}
): PublicShelfBook => ({
  id,
  isbn: id,
  title: `책 ${id}`,
  cover_image: `https://img/${id}/cover`,
  spine_image: `https://img/${id}/spine`,
  thickness_mm: 20,
  is_life_book: false,
  rating: 4,
  completed_date: '2026-05-01',
  completed_year: null,
  ...over,
});

const many = (n: number, over: Partial<PublicShelfBook> = {}) =>
  Array.from({ length: n }, (_, i) => book(String(i), over));

describe('toStoryShelf', () => {
  it('인생책·5점은 표지로, 나머지는 책등 이미지로 세운다 — 서재 책장과 같은 규칙', () => {
    const shelf = toStoryShelf(
      [
        book('life', { is_life_book: true }),
        book('five', { rating: 5 }),
        ...many(3),
      ],
      { year: 2026, onlyThisYear: false }
    );
    expect(shelf?.map((item) => item.kind)).toEqual([
      'cover',
      'cover',
      'spine',
      'spine',
      'spine',
    ]);
  });

  it('책등 이미지가 없으면 두께로 폭을 만든 글자 책등이다', () => {
    const shelf = toStoryShelf(
      many(5, { spine_image: null, thickness_mm: 10 }),
      {
        year: 2026,
        onlyThisYear: false,
      }
    );
    expect(shelf?.[0]).toMatchObject({
      kind: 'plain',
      title: '책 0',
      width: 32,
    });
  });

  it('올해 숫자를 보여 줄 때는 올해 완독한 책만 세운다', () => {
    const shelf = toStoryShelf(
      [
        ...many(5),
        book('old', { completed_date: '2019-01-01' }),
        book('year-only', { completed_date: null, completed_year: 2026 }),
      ],
      { year: 2026, onlyThisYear: true }
    );
    expect(shelf?.map((item) => item.key)).not.toContain('old');
    expect(shelf?.map((item) => item.key)).toContain('year-only');
  });

  it('세울 책이 적으면 null — 비어 보이는 책장 대신 표지 일렬', () => {
    expect(
      toStoryShelf(many(STORY_SHELF_MIN_BOOKS - 1), {
        year: 2026,
        onlyThisYear: false,
      })
    ).toBeNull();
  });

  it('최대 권수까지만 넘긴다 — 넘긴 만큼 이미지를 받아 와야 한다', () => {
    expect(
      toStoryShelf(many(100), { year: 2026, onlyThisYear: false })
    ).toHaveLength(STORY_SHELF_MAX_BOOKS);
  });
});
