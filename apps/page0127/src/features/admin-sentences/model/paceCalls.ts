/**
 * 서점(YES24) API 를 여러 번 부를 때 속도를 늦춘다 (HJ, 2026-11-18).
 *
 * 왜: 어드민 "표지 채우기"가 74권을 5개씩 쉬지 않고 물었더니 1초 만에 429(너무 많은 요청)로
 * 27권이 막혔다. YES24 는 짧은 시간 안의 요청 수를 제한한다(정확한 한도는 공개돼 있지 않다).
 *
 * - paceCalls: concurrency 개씩 묶어 부르고, 묶음 사이에 gapMs 만큼 쉰다. 결과 순서 = 입력 순서.
 * - retryOn429: 429 면 waitMs 쉬고 다시(쉬는 시간은 매번 두 배), retries 번까지.
 *   429 가 아닌 실패(없는 ISBN, 키 오류 등)는 다시 묻지 않고 그대로 던진다.
 */

export type Sleep = (ms: number) => Promise<void>;

const defaultSleep: Sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** callYes24 는 `YES24 API 오류: 429` 처럼 상태 코드를 메시지에 담아 던진다 */
export const isRateLimitError = (error: unknown): boolean =>
  error instanceof Error && /\b429\b/.test(error.message);

export const retryOn429 = async <R>(
  fn: () => Promise<R>,
  { retries = 2, waitMs = 2000, sleep = defaultSleep } = {}
): Promise<R> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= retries) throw error;
      await sleep(waitMs * 2 ** attempt);
    }
  }
};

export const paceCalls = async <T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  { concurrency = 2, gapMs = 400, sleep = defaultSleep } = {}
): Promise<PromiseSettledResult<R>[]> => {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    if (i > 0) await sleep(gapMs);
    results.push(
      ...(await Promise.allSettled(items.slice(i, i + concurrency).map(fn)))
    );
  }
  return results;
};
