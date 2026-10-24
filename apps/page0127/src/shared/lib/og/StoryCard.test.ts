import { describe, expect, it } from 'vitest';

import { type StoryShelfItem, toShelfLayout } from './StoryCard';

const spines = (n: number): StoryShelfItem[] =>
  Array.from({ length: n }, (_, i) => ({
    kind: 'spine',
    key: String(i),
    title: '책',
    src: `s${i}`,
  }));
const covers = (n: number): StoryShelfItem[] =>
  Array.from({ length: n }, (_, i) => ({
    kind: 'cover',
    key: `c${i}`,
    title: '책',
    src: `c${i}`,
  }));

const WIDTH = 904;

describe('toShelfLayout', () => {
  it('책이 적으면 한 단, 표지 한 장이 화면을 덮지 않게 높이에 상한이 있다', () => {
    const { rows, bookHeight } = toShelfLayout(spines(5), WIDTH);
    expect(rows).toBe(1);
    expect(bookHeight).toBe(380);
  });

  it('한 단에 다 들어가는 높이로 선반 폭을 채운다 (올해 15권 = 표지 2 + 책등 13)', () => {
    const items = [...covers(2), ...spines(13)];
    const { rows, bookHeight } = toShelfLayout(items, WIDTH);
    expect(rows).toBe(1);
    // 추정 폭 합이 선반 폭을 넘지 않는다
    const used = bookHeight * (2 * (2 / 3) + 13 * 0.085) + 3 * 14;
    expect(used).toBeLessThanOrEqual(WIDTH);
    expect(used).toBeGreaterThan(WIDTH * 0.9);
  });

  it('한 단이면 책이 실처럼 낮아질 때는 두 단으로 나눈다', () => {
    const { rows, bookHeight } = toShelfLayout(
      [...covers(8), ...spines(30)],
      WIDTH
    );
    expect(rows).toBe(2);
    // 두 단 + 틈이 쓸 수 있는 세로 안에 든다
    expect(bookHeight * 2 + 12 * 2 + 36).toBeLessThanOrEqual(480);
  });
});
