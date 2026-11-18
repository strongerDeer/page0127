import { describe, expect, it, vi } from 'vitest';

import { isRateLimitError, paceCalls, retryOn429 } from './paceCalls';

const noSleep = vi.fn(async () => {});

describe('paceCalls', () => {
  it('concurrency 개씩 부르고 묶음 사이에 쉰다, 결과 순서는 입력 순서', async () => {
    const sleep = vi.fn(async () => {});
    let running = 0;
    let peak = 0;
    const results = await paceCalls(
      [1, 2, 3, 4, 5],
      async (n) => {
        running += 1;
        peak = Math.max(peak, running);
        await Promise.resolve();
        running -= 1;
        if (n === 3) throw new Error('x');
        return n * 10;
      },
      { concurrency: 2, gapMs: 400, sleep }
    );

    expect(peak).toBe(2);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(400);
    expect(results.map((r) => r.status)).toEqual([
      'fulfilled',
      'fulfilled',
      'rejected',
      'fulfilled',
      'fulfilled',
    ]);
  });
});

describe('retryOn429', () => {
  it('429 면 쉬는 시간을 두 배로 늘리며 다시 묻는다', async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('YES24 API 오류: 429'))
      .mockRejectedValueOnce(new Error('YES24 API 오류: 429'))
      .mockResolvedValueOnce('ok');

    await expect(
      retryOn429(fn, { retries: 2, waitMs: 1000, sleep })
    ).resolves.toBe('ok');
    expect(sleep.mock.calls).toEqual([[1000], [2000]]);
  });

  it('429 가 아니면 다시 묻지 않고, 횟수를 넘기면 마지막 에러를 던진다', async () => {
    const other = vi.fn().mockRejectedValue(new Error('YES24 API 오류: 500'));
    await expect(retryOn429(other, { sleep: noSleep })).rejects.toThrow('500');
    expect(other).toHaveBeenCalledTimes(1);

    const always = vi.fn().mockRejectedValue(new Error('YES24 API 오류: 429'));
    await expect(
      retryOn429(always, { retries: 1, sleep: noSleep })
    ).rejects.toThrow('429');
    expect(always).toHaveBeenCalledTimes(2);
  });

  it('isRateLimitError 는 429 만 알아본다', () => {
    expect(isRateLimitError(new Error('YES24 API 오류: 429'))).toBe(true);
    expect(isRateLimitError(new Error('YES24 API 오류: 4290'))).toBe(false);
    expect(isRateLimitError('429')).toBe(false);
  });
});
