import { describe, expect, it } from 'vitest';

import {
  describeLastSeen,
  formatKstDateTime,
  maskEmail,
  providerLabel,
  summarizeVisits,
} from './memberStats';

describe('maskEmail', () => {
  it('앞 3글자와 도메인만 남긴다', () => {
    expect(maskEmail('dreamfulbud@gmail.com')).toBe('dre***@gmail.com');
  });
  it('3글자 이하 아이디는 1글자만 남긴다', () => {
    expect(maskEmail('abc@kakao.com')).toBe('a***@kakao.com');
    expect(maskEmail('a@kakao.com')).toBe('a***@kakao.com');
  });
  it('null 은 null', () => {
    expect(maskEmail(null)).toBeNull();
  });
  it('형식이 깨진 값은 원문을 흘리지 않는다', () => {
    expect(maskEmail('not-an-email')).toBe('***');
    expect(maskEmail('@gmail.com')).toBe('***');
  });
});

describe('summarizeVisits', () => {
  it('회원별 활동일 수와 마지막 방문일을 낸다 (행 순서와 무관)', () => {
    const map = summarizeVisits([
      { user_id: 'a', visit_date: '2026-10-02' },
      { user_id: 'a', visit_date: '2026-10-03' },
      { user_id: 'a', visit_date: '2026-09-20' },
      { user_id: 'b', visit_date: '2026-10-01' },
    ]);
    expect(map.get('a')).toEqual({ activeDays: 3, lastVisit: '2026-10-03' });
    expect(map.get('b')).toEqual({ activeDays: 1, lastVisit: '2026-10-01' });
    expect(map.get('c')).toBeUndefined();
  });
});

describe('formatKstDateTime', () => {
  it('UTC 시각을 KST 로 찍는다 (UTC 23:30 → 다음 날 오전 8:30)', () => {
    const s = formatKstDateTime('2026-10-03T23:30:00Z');
    expect(s).toContain('2026. 10. 4.');
    expect(s).toContain('8:30');
  });
});

describe('providerLabel', () => {
  it('알려진 값은 한국어로, 모르는 값은 그대로, 없으면 -', () => {
    expect(providerLabel('google')).toBe('구글');
    expect(providerLabel('kakao')).toBe('카카오');
    expect(providerLabel('github')).toBe('github');
    expect(providerLabel(undefined)).toBe('-');
  });
});

describe('describeLastSeen', () => {
  const today = '2026-11-24';
  it('오늘·어제·N일 전은 recent', () => {
    expect(describeLastSeen('2026-11-24', today)).toEqual({
      kind: 'recent',
      relative: '오늘',
      short: '11/24',
      today: true,
    });
    expect(describeLastSeen('2026-11-23', today)).toMatchObject({
      relative: '어제',
      today: false,
    });
    expect(describeLastSeen('2026-11-18', today)).toMatchObject({
      kind: 'recent',
      relative: '6일 전',
    });
  });
  it('7일 이상 지나면 old (날짜만)', () => {
    expect(describeLastSeen('2026-11-17', today)).toEqual({
      kind: 'old',
      short: '11/17',
    });
  });
  it('해가 다르면 연도를 붙인다', () => {
    expect(describeLastSeen('2025-12-30', '2026-01-02')).toMatchObject({
      kind: 'recent',
      relative: '3일 전',
      short: '25.12/30',
    });
  });
  it('없으면 none', () => {
    expect(describeLastSeen(null, today)).toEqual({ kind: 'none' });
  });
});
