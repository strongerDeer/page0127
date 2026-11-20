import { describe, expect, it } from 'vitest';

import { estimateShelfItemWidth, packShelfRows } from './shelfRows';

type ShelfBook = Parameters<typeof estimateShelfItemWidth>[0];

const book = (overrides: Partial<ShelfBook> = {}): ShelfBook => ({
  rating: 3,
  is_life_book: false,
  spine_image: null,
  thickness_mm: 20,
  is_public: true,
  ...overrides,
});

describe('estimateShelfItemWidth', () => {
  it('5점 책은 표지 폭으로 어림한다', () => {
    expect(estimateShelfItemWidth(book({ rating: 5 }))).toBe(174);
    expect(estimateShelfItemWidth(book({ rating: 5 }), 'compact')).toBe(153);
  });

  it('책등 이미지가 있으면 이미지 폭(넓은 쪽)으로 어림한다', () => {
    expect(
      estimateShelfItemWidth(book({ spine_image: 'https://x/s.jpg' }))
    ).toBe(28);
  });

  it('글자 책등은 두께로 폭을 정하고, 누르는 칸 24px 아래로는 줄이지 않는다', () => {
    expect(estimateShelfItemWidth(book({ thickness_mm: 20 }))).toBe(27);
    expect(
      estimateShelfItemWidth(book({ thickness_mm: 1 }))
    ).toBeGreaterThanOrEqual(24);
  });

  it('비공개 책(북커버)은 책등 이미지가 있어도 두께 폭이다', () => {
    expect(
      estimateShelfItemWidth(
        book({ spine_image: 'https://x/s.jpg', is_public: false })
      )
    ).toBe(27);
  });
});

describe('packShelfRows', () => {
  it('넘치기 직전까지 한 단에 채우고 다음 단으로 넘긴다', () => {
    // 쓸 수 있는 폭 100 (safety 1) → 40+40 / 40+40 / 40
    expect(packShelfRows([40, 40, 40, 40, 40], 100, 'normal', 1)).toEqual([
      [0, 1],
      [2, 3],
      [4],
    ]);
  });

  it('안전 여유만큼 좁게 잡아서, 딱 맞는 줄도 넘기지 않는다', () => {
    // 100 × 0.94 = 94 → 50+50 은 넘침
    expect(packShelfRows([50, 50], 100)).toEqual([[0], [1]]);
  });

  it('한 권이 단보다 넓어도 빈 단을 만들지 않는다', () => {
    expect(packShelfRows([500, 10], 100, 'normal', 1)).toEqual([[0], [1]]);
  });

  it('조밀 선반은 책 사이 2px 간격까지 센다', () => {
    expect(packShelfRows([50, 50], 100, 'compact', 1)).toEqual([[0], [1]]);
    expect(packShelfRows([50, 50], 100, 'normal', 1)).toEqual([[0, 1]]);
  });

  it('책이 없으면 단도 없다', () => {
    expect(packShelfRows([], 1000)).toEqual([]);
  });
});
