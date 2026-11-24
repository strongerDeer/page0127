import { describe, expect, it, vi } from 'vitest';

import { onNewBookEntryRequest, requestNewBookEntry } from './newBookEntry';

describe('newBookEntry', () => {
  it('구독 중이면 신호를 받는다', () => {
    const handler = vi.fn();
    const unsubscribe = onNewBookEntryRequest(handler);

    requestNewBookEntry();
    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('구독을 풀면 더 받지 않는다 — 페이지를 떠난 뒤 + 를 눌러도 아무 일 없음', () => {
    const handler = vi.fn();
    const unsubscribe = onNewBookEntryRequest(handler);
    unsubscribe();

    requestNewBookEntry();
    expect(handler).not.toHaveBeenCalled();
  });
});
