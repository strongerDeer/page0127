import { describe, expect, it } from 'vitest';

import { decideShare, toShareViewState } from './share';

const base = {
  user_id_1: 'a',
  user_id_2: 'b',
  requested_by: 'a',
  shared_at: null,
};

describe('decideShare', () => {
  it('분석한 사람만 알릴 수 있고, 상대가 받는다', () => {
    expect(decideShare(base, 'a')).toEqual({ kind: 'share', partnerId: 'b' });
    expect(decideShare({ ...base, requested_by: 'b' }, 'b')).toEqual({
      kind: 'share',
      partnerId: 'a',
    });
  });

  it('상대나 요청자를 모르는 옛 결과는 알릴 수 없다', () => {
    expect(decideShare(base, 'b')).toEqual({ kind: 'forbidden' });
    expect(decideShare({ ...base, requested_by: null }, 'a')).toEqual({
      kind: 'forbidden',
    });
  });

  it('이미 알렸으면 다시 보내지 않는다', () => {
    expect(decideShare({ ...base, shared_at: '2026-11-24' }, 'a')).toEqual({
      kind: 'already',
      partnerId: 'b',
    });
  });
});

describe('toShareViewState', () => {
  it('보는 사람 기준 상태', () => {
    expect(toShareViewState(base, 'a')).toBe('can-share');
    expect(toShareViewState({ ...base, shared_at: 'x' }, 'a')).toBe('shared');
    expect(toShareViewState({ ...base, shared_at: 'x' }, 'b')).toBe('received');
    expect(toShareViewState({ ...base, requested_by: null }, 'a')).toBe('none');
  });
});
