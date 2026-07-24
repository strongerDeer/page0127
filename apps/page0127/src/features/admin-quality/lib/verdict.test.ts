import { describe, expect, it } from 'vitest';

import { verdict } from './verdict';

describe('verdict', () => {
  it('랩 LCP는 항상 neutral (판정 제외)', () => {
    expect(verdict('labLcp', 9000, 'mobile')).toBe('neutral');
  });
  it('실사용자 LCP 2500ms 이하 good은 pass', () => {
    expect(verdict('fieldLcpP75', 2000, 'mobile')).toBe('pass');
  });
  it('실사용자 LCP 4000ms 초과는 fail', () => {
    expect(verdict('fieldLcpP75', 4500, 'mobile')).toBe('fail');
  });
});
