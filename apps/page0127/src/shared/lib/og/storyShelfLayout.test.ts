import { describe, expect, it } from 'vitest';

import {
  bookWidth,
  SHELF_BOOK_GAP,
  type StoryShelfItem,
  toShelfLayout,
} from './storyShelfLayout';

type Spine = Extract<StoryShelfItem, { kind: 'spine' }>;

const spine = (i: number, ratio = 0.06): Spine => ({
  kind: 'spine',
  key: `s${i}`,
  title: '책',
  src: `s${i}`,
  ratio,
  fallbackWidth: 41,
});
const cover = (i: number): StoryShelfItem => ({
  kind: 'cover',
  key: `c${i}`,
  title: '책',
  src: `c${i}`,
});
const spines = (n: number, ratio?: number) =>
  Array.from({ length: n }, (_, i) => spine(i, ratio));

const WIDTH = 904;

/** 한 단이 실제로 차지하는 폭 */
const rowWidth = (row: StoryShelfItem[], height: number) =>
  row.reduce((sum, item) => sum + bookWidth(item, height), 0) +
  SHELF_BOOK_GAP * (row.length - 1);

describe('toShelfLayout', () => {
  it('책이 적으면 1단, 높이 상한에서 멈춘다(가운데에 선다)', () => {
    const layout = toShelfLayout(spines(5), WIDTH);
    expect(layout.rows).toHaveLength(1);
    expect(layout.bookHeight).toBe(380);
  });

  it('운영에서 빈 둘째 단이 섰던 경우 — 표지 5 + 얇은 책등 10 은 1단에 다 들어간다', () => {
    const layout = toShelfLayout(
      [...Array.from({ length: 5 }, (_, i) => cover(i)), ...spines(10, 0.05)],
      WIDTH
    );
    expect(layout.rows).toHaveLength(1);
    expect(rowWidth(layout.rows[0], layout.bookHeight)).toBeLessThanOrEqual(
      WIDTH
    );
  });

  it('한 단이면 실처럼 낮아질 때만 2단 — 두 단 폭이 비슷하고 둘 다 선반에 맞는다', () => {
    const layout = toShelfLayout(
      [...Array.from({ length: 8 }, (_, i) => cover(i)), ...spines(30)],
      WIDTH
    );
    expect(layout.rows).toHaveLength(2);
    const [a, b] = layout.rows.map((row) => rowWidth(row, layout.bookHeight));
    expect(Math.max(a, b)).toBeLessThanOrEqual(WIDTH);
    // 한 단에 몇 권만 남는 모양이 아니다
    expect(Math.min(a, b) / Math.max(a, b)).toBeGreaterThan(0.8);
    expect(layout.bookHeight).toBeLessThanOrEqual(190);
  });

  it('비율을 모르는 책등도 추정으로 세운다', () => {
    const layout = toShelfLayout(
      [{ ...spine(0), ratio: null }, ...spines(4)],
      WIDTH
    );
    expect(layout.rows).toHaveLength(1);
  });
});
