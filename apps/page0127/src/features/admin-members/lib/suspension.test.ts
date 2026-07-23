import { describe, expect, it } from 'vitest';

import { computeBan, isCurrentlySuspended } from './suspension';

describe('computeBan', () => {
  it('영구 정지: 긴 기간 + suspendedUntil null', () => {
    const r = computeBan(
      { kind: 'permanent' },
      new Date('2026-07-23T00:00:00Z')
    );
    expect(r.banDuration).toBe('876000h');
    expect(r.suspendedUntil).toBeNull();
  });
  it('7일 정지: 168h + 7일 뒤 시각', () => {
    const now = new Date('2026-07-23T00:00:00Z');
    const r = computeBan({ kind: 'days', days: 7 }, now);
    expect(r.banDuration).toBe('168h');
    expect(r.suspendedUntil).toBe('2026-07-30T00:00:00.000Z');
  });
});

describe('isCurrentlySuspended', () => {
  const now = new Date('2026-07-23T00:00:00Z');
  it('active면 false', () => {
    expect(isCurrentlySuspended('active', null, now)).toBe(false);
  });
  it('suspended + until null(영구)이면 true', () => {
    expect(isCurrentlySuspended('suspended', null, now)).toBe(true);
  });
  it('suspended + 미래 until이면 true', () => {
    expect(isCurrentlySuspended('suspended', '2026-08-01T00:00:00Z', now)).toBe(
      true
    );
  });
  it('suspended + 과거 until이면 false(만료 자가치유)', () => {
    expect(isCurrentlySuspended('suspended', '2026-07-01T00:00:00Z', now)).toBe(
      false
    );
  });
});
