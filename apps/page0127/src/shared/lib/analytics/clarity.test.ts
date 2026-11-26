import { afterEach, describe, expect, it, vi } from 'vitest';

import { setClarityTag, stopClarity } from './clarity';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Clarity 래퍼', () => {
  it('스크립트가 오기 전에 단 태그는 큐에 쌓아 둔다', () => {
    const win = {} as Window;
    vi.stubGlobal('window', win);
    setClarityTag('account', 'demo');
    const queued = win.clarity as unknown as { q: unknown[][] };
    expect(queued.q).toEqual([['set', 'account', 'demo']]);
  });

  it('이미 붙은 Clarity 에는 바로 stop 을 보낸다', () => {
    const clarity = vi.fn();
    vi.stubGlobal('window', { clarity });
    stopClarity();
    expect(clarity).toHaveBeenCalledWith('stop');
  });

  it('Clarity 가 없으면 stop 은 아무 일도 하지 않는다', () => {
    vi.stubGlobal('window', {});
    expect(() => stopClarity()).not.toThrow();
  });
});
