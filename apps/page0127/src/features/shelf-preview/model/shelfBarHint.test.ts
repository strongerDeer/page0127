import { describe, expect, it } from 'vitest';

import { toShelfBarHint } from './shelfBarHint';

describe('toShelfBarHint', () => {
  it('세 권 전에는 첫인상까지 남은 권수를 말한다', () => {
    expect(toShelfBarHint(1, null)).toBe('2권만 더 고르면 첫인상');
    expect(toShelfBarHint(2, null)).toBe('1권만 더 고르면 첫인상');
  });

  it('세 권부터는 첫인상 이름이 주인공이다', () => {
    expect(toShelfBarHint(3, '이야기에 사는 사람')).toBe('이야기에 사는 사람');
  });

  it('첫인상이 없으면(분류 불명 책뿐) 지어내지 않는다', () => {
    expect(toShelfBarHint(4, null)).toBeNull();
  });
});
