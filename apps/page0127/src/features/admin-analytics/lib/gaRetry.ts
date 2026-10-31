/**
 * GA4 Data API 호출의 429(RESOURCE_EXHAUSTED) 재시도.
 *
 * GA 속성은 "동시 요청" 한도가 있다. 유입분석은 보고서 20개를 batch 4개로 나눠 보내는데,
 * 기간을 빠르게 바꾸거나 새로고침하면 앞 요청이 끝나기 전에 다음 요청이 겹쳐 한도에 걸린다
 * (2026-10-31 운영: "Exhausted concurrent requests quota").
 * 이 한도는 앞 요청이 끝나면 바로 풀리므로, 잠깐 기다렸다 다시 보내면 대부분 성공한다.
 * 그래서 화면에 오류를 띄우기 전에 짧게 몇 번 재시도한다.
 */

/** 재시도할 상태 코드 — 429(한도), 503(GA 일시 장애) */
const RETRYABLE_STATUS = new Set([429, 503]);

export type RetryOptions = {
  /** 첫 시도 뒤 추가로 시도할 횟수 */
  retries?: number;
  /** 첫 재시도 대기(ms). 이후 2배씩 늘린다 */
  baseDelayMs?: number;
  /** 테스트에서 시간을 건너뛰려고 주입한다 */
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * doFetch 를 부르고, 응답이 429/503 이면 지수 백오프(+약간의 흔들림)로 다시 부른다.
 * 마지막 응답은 성공이든 실패든 그대로 돌려준다 — 오류 처리는 호출한 쪽 몫이다.
 */
export async function fetchWithGaRetry(
  doFetch: () => Promise<Response>,
  { retries = 2, baseDelayMs = 800, sleep = defaultSleep }: RetryOptions = {}
): Promise<Response> {
  let res = await doFetch();
  for (let attempt = 0; attempt < retries; attempt++) {
    if (!RETRYABLE_STATUS.has(res.status)) return res;
    // 같은 순간에 실패한 batch 들이 또 동시에 몰리지 않게 대기 시간을 조금씩 흩뜨린다
    const jitter = Math.random() * 200;
    await sleep(baseDelayMs * 2 ** attempt + jitter);
    res = await doFetch();
  }
  return res;
}

/**
 * items 를 최대 limit 개씩만 동시에 처리한다(순서는 결과 배열에서 유지).
 * Promise.all 로 전부 한꺼번에 보내면 GA 동시 요청 한도에 쉽게 닿는다.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}
