import { describe, expect, it } from 'vitest';

import { mapWithLimit } from './mapWithLimit';

describe('mapWithLimit', () => {
  it('동시에 limit 개까지만 돌리고 결과는 입력 순서다', async () => {
    let running = 0;
    let peak = 0;
    const result = await mapWithLimit([30, 10, 20, 5, 15], 2, async (ms, i) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, ms));
      running -= 1;
      return i;
    });
    expect(result).toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  it('빈 배열이면 빈 배열', async () => {
    expect(await mapWithLimit([], 4, async (x) => x)).toEqual([]);
  });
});
