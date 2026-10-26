/**
 * 배열을 비동기로 처리하되, 동시에 `limit` 개까지만 돌린다. 결과 순서는 입력 순서다.
 *
 * 왜 필요한가: YES24 는 초당 10건 한도다. 100권을 `Promise.all` 로 한꺼번에 쏘면
 * 한도를 넘겨 뒤쪽이 줄줄이 실패하고, 한 권씩 차례로 하면 100권에 30초가 넘는다.
 * 그 사이 — 몇 개씩만 겹쳐 돌린다.
 *
 * 한 항목의 실패가 나머지를 멈추지 않도록 실패 처리는 `fn` 안에서 한다.
 */
export const mapWithLimit = async <T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
};
