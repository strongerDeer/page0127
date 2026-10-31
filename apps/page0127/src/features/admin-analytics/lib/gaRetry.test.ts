import { describe, expect, it, vi } from 'vitest';

import { fetchWithGaRetry, mapWithConcurrency } from './gaRetry';

const res = (status: number) => new Response(null, { status });
const noSleep = () => Promise.resolve();

describe('fetchWithGaRetry', () => {
  it('성공하면 한 번만 부른다', async () => {
    const doFetch = vi.fn().mockResolvedValue(res(200));
    const r = await fetchWithGaRetry(doFetch, { sleep: noSleep });
    expect(r.status).toBe(200);
    expect(doFetch).toHaveBeenCalledTimes(1);
  });

  it('429 뒤 성공하면 성공 응답을 돌려준다', async () => {
    const doFetch = vi
      .fn()
      .mockResolvedValueOnce(res(429))
      .mockResolvedValueOnce(res(200));
    const r = await fetchWithGaRetry(doFetch, { sleep: noSleep });
    expect(r.status).toBe(200);
    expect(doFetch).toHaveBeenCalledTimes(2);
  });

  it('계속 429 면 retries 만큼만 더 시도하고 마지막 응답을 준다', async () => {
    const doFetch = vi.fn().mockResolvedValue(res(429));
    const r = await fetchWithGaRetry(doFetch, { retries: 2, sleep: noSleep });
    expect(r.status).toBe(429);
    expect(doFetch).toHaveBeenCalledTimes(3);
  });

  it('403 같은 다른 실패는 재시도하지 않는다', async () => {
    const doFetch = vi.fn().mockResolvedValue(res(403));
    const r = await fetchWithGaRetry(doFetch, { sleep: noSleep });
    expect(r.status).toBe(403);
    expect(doFetch).toHaveBeenCalledTimes(1);
  });
});

describe('mapWithConcurrency', () => {
  it('동시에 limit 개를 넘지 않고 순서를 지킨다', async () => {
    let running = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
    expect(peak).toBe(2);
  });
});
