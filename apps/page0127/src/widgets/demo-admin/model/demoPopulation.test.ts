import { describe, expect, it } from 'vitest';

import { parseDateRange } from '@/shared/lib/admin/dateRange';

import { demoFunnel, demoOverview, demoTrends } from './demoOverview';
import { buildDemoPopulation } from './demoPopulation';

const NOW = new Date('2026-11-26T12:00:00+09:00');

describe('데모 어드민 가상 회원', () => {
  it('같은 시각이면 늘 같은 숫자 — 새로고침마다 바뀌면 예시가 아니라 고장처럼 보인다', () => {
    expect(buildDemoPopulation(NOW)).toEqual(buildDemoPopulation(NOW));
  });

  it('숫자는 지금 규모에 가깝게 작다(HJ 2026-11-26: 부풀리지 않기)', () => {
    const p = buildDemoPopulation(NOW);
    const o = demoOverview(p, NOW);
    expect(p.members.length).toBeGreaterThan(20);
    expect(p.members.length).toBeLessThan(150);
    expect(o.activity?.dau).toBeGreaterThan(0);
    expect(o.activity?.dau).toBeLessThan(40);
  });

  it('지금보다 뒤의 기록은 없다 — 오후에 밤 방문이 보이면 안 된다', () => {
    const p = buildDemoPopulation(NOW);
    const nowMs = NOW.getTime();
    expect(
      p.visits.every((v) => new Date(v.first_visit_at).getTime() <= nowMs)
    ).toBe(true);
    expect(
      p.books.every((b) => new Date(b.created_at).getTime() <= nowMs)
    ).toBe(true);
  });

  it('추이 가입 합계와 퍼널 가입자 수가 맞물린다(같은 원본에서 센다)', () => {
    const p = buildDemoPopulation(NOW);
    const range = parseDateRange({ range: '30d' }, NOW);
    const signups = demoTrends(p, range).signups.reduce(
      (a, x) => a + x.count,
      0
    );
    expect(demoFunnel(p, range, NOW).steps[0].users).toBe(signups);
  });
});
