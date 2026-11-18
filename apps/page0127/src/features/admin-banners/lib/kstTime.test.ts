import { describe, expect, it } from 'vitest';

import { isoToKstInput, kstInputToIso } from './kstTime';

describe('isoToKstInput', () => {
  it('UTC 시각을 KST 벽시계로 보여 준다', () => {
    // 12/24 00:00 KST = 12/23 15:00 UTC
    expect(isoToKstInput('2026-12-23T15:00:00+00:00')).toBe('2026-12-24T00:00');
  });
  it('비었거나 깨진 값은 빈칸', () => {
    expect(isoToKstInput(null)).toBe('');
    expect(isoToKstInput('nope')).toBe('');
  });
});

describe('kstInputToIso', () => {
  it('+09:00 을 붙여 저장한다', () => {
    expect(kstInputToIso('2026-12-24T00:00')).toBe('2026-12-24T00:00:00+09:00');
  });
  it('빈 값은 null(제한 없음)', () => {
    expect(kstInputToIso('  ')).toBeNull();
  });
  it('왕복해도 같은 값', () => {
    const iso = kstInputToIso('2027-01-01T09:30')!;
    expect(isoToKstInput(iso)).toBe('2027-01-01T09:30');
  });
  it('형식이 틀리면 던진다', () => {
    expect(() => kstInputToIso('2026/12/24')).toThrow();
  });
});
