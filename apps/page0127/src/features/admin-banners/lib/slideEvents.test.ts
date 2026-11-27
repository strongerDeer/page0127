import { describe, expect, it } from 'vitest';

import { describeChanges, diffSlide, eventTime } from './slideEvents';

import type { HeroSlideRow } from '@/entities/banner/types';

const before = {
  line1: '『어린 왕자』를',
  sub: '',
  starts_at: '2026-12-01T00:00:00+00:00',
  belt_art_url: null,
  show_number: true,
} as unknown as HeroSlideRow;

describe('diffSlide', () => {
  it('바뀐 칸만 돌려준다', () => {
    const changes = diffSlide(before, {
      line1: '『어린 왕자』,',
      sub: '',
      show_number: true,
    });
    expect(changes).toEqual({
      line1: { from: '『어린 왕자』를', to: '『어린 왕자』,' },
    });
  });
  it('시각은 표기가 달라도 같은 순간이면 안 바뀐 것', () => {
    expect(
      diffSlide(before, { starts_at: '2026-12-01T09:00:00+09:00' })
    ).toEqual({});
  });
  it('빈 문자열과 null 은 같은 "비움"', () => {
    expect(diffSlide(before, { sub: null })).toEqual({});
  });
});

describe('describeChanges', () => {
  it('칸 이름과 전후 값을 사람 말로', () => {
    expect(
      describeChanges({
        line1: { from: 'A', to: 'B' },
        audience: { from: 'all', to: 'guest' },
        belt_art_url: { from: null, to: 'https://x/a.webp' },
        ends_at: { from: null, to: '2026-12-31T15:00:00+00:00' },
      })
    ).toEqual([
      '큰 문장 첫 줄: A → B',
      '노출 대상: 모두 → 비회원',
      '띠지 배경 그림 넣음',
      '종료: (비움) → 2027-01-01 00:00',
    ]);
  });
});

describe('eventTime', () => {
  it('한국 시간 "월.일 시:분"', () => {
    expect(eventTime('2026-11-27T08:55:00Z')).toBe('11.27 17:55');
  });
});
