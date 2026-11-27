import { describe, expect, it } from 'vitest';

import { homeSlides, slideStatus } from './slideStatus';

const now = new Date('2026-11-27T09:00:00Z');
const slide = (
  id: string,
  over: Partial<{
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    audience: 'all' | 'guest' | 'member';
  }> = {}
) => ({
  id,
  is_active: true,
  starts_at: null,
  ends_at: null,
  audience: 'all' as const,
  ...over,
});

describe('slideStatus', () => {
  it('노출을 끄면 기간과 상관없이 off', () => {
    expect(slideStatus(slide('a', { is_active: false }), now)).toBe('off');
  });
  it('시작 전이면 scheduled', () => {
    expect(
      slideStatus(slide('a', { starts_at: '2026-11-28T00:00:00Z' }), now)
    ).toBe('scheduled');
  });
  it('종료가 지났으면 ended (종료 시각 정각도 지난 것)', () => {
    expect(
      slideStatus(slide('a', { ends_at: '2026-11-27T09:00:00Z' }), now)
    ).toBe('ended');
  });
  it('기간 안이거나 기간이 없으면 live', () => {
    expect(slideStatus(slide('a'), now)).toBe('live');
    expect(
      slideStatus(
        slide('a', {
          starts_at: '2026-11-01T00:00:00Z',
          ends_at: '2026-12-01T00:00:00Z',
        }),
        now
      )
    ).toBe('live');
  });
});

describe('homeSlides', () => {
  it('비회원·회원 각각 맞는 게시 중 배너의 맨 앞 하나', () => {
    const rows = [
      slide('off', { is_active: false }),
      slide('member', { audience: 'member' }),
      slide('all'),
    ];
    const home = homeSlides(rows, now);
    expect(home.guest?.id).toBe('all');
    expect(home.member?.id).toBe('member');
  });
  it('게시 중이 없으면 둘 다 null(기본 띠지)', () => {
    const home = homeSlides(
      [slide('later', { starts_at: '2026-12-01T00:00:00Z' })],
      now
    );
    expect(home).toEqual({ guest: null, member: null });
  });
});
