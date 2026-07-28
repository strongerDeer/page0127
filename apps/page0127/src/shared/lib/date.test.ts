import { describe, expect, it } from 'vitest';

import { toKstDateKey } from './date';

describe('toKstDateKey', () => {
  it('KST 자정 직전은 아직 같은 날이다', () => {
    // 2026-07-28 14:59Z = KST 2026-07-28 23:59
    expect(toKstDateKey(new Date('2026-07-28T14:59:00.000Z'))).toBe('2026-07-28');
  });

  it('KST 자정에 날짜가 넘어간다', () => {
    // 2026-07-28 15:00Z = KST 2026-07-29 00:00 — UTC로 자르면 28일로 잘못 센다
    expect(toKstDateKey(new Date('2026-07-28T15:00:00.000Z'))).toBe(
      '2026-07-29'
    );
  });

  it('연말 경계에서도 KST 기준으로 넘어간다', () => {
    expect(toKstDateKey(new Date('2026-12-31T15:00:00.000Z'))).toBe(
      '2027-01-01'
    );
  });
});
