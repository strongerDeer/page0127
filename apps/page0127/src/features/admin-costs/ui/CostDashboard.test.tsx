import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { CostDashboard } from './CostDashboard';

import type { CostSummary } from '../api/getCostSummary';
import type { OpenAiCostsResult } from '../api/getOpenAiCosts';

// 운영 앱 기록: 취향 분석 1회 $0.04
const summary: CostSummary = {
  monthTotalCents: 4,
  daily: [{ date: '2026-10-05', cents: 4 }],
  byFeature: {
    taste: { cents: 4, count: 1 },
    compatibility: { cents: 0, count: 0 },
  },
  topUsers: [],
};

const actual = (totalCents: number): OpenAiCostsResult => ({
  ok: true,
  costs: {
    totalCents,
    daily: [
      { date: '2026-10-05', cents: 4 },
      { date: '2026-10-18', cents: totalCents - 4 },
    ],
  },
});

describe('CostDashboard', () => {
  it('실제 청구액을 읽었으면 그걸 큰 숫자로 — 로컬·테스트에서 쓴 돈도 빠지지 않게', () => {
    const html = renderToStaticMarkup(
      <CostDashboard summary={summary} actual={actual(7)} />
    );
    expect(html).toContain('실제 청구 (로컬·운영·테스트 합산)');
    expect(html).toContain('$0.07');
    // 앱 기록과 차이를 나눠 보여 준다
    expect(html).toContain('운영 앱 기록 $0.04');
    expect(html).toContain('그 밖(로컬·테스트 등) $0.03');
    // 일별은 둘을 나란히 — 10/18 로컬 테스트일(실제 청구만)과 10/05 운영 기록이 함께 보인다
    expect(html).toContain('2026-10-18');
    expect(html).toContain('운영 앱 기록</th>');
  });

  it('실제 청구에 아직 없는 날의 운영 기록도 일별에 보인다', () => {
    const html = renderToStaticMarkup(
      <CostDashboard
        summary={{
          ...summary,
          daily: [...summary.daily, { date: '2026-10-25', cents: 4 }],
        }}
        actual={actual(7)}
      />
    );
    expect(html).toContain('2026-10-25');
  });

  it('관리자 키가 없으면 앱 기록만, 무엇이 빠졌는지 알린다', () => {
    const html = renderToStaticMarkup(
      <CostDashboard
        summary={summary}
        actual={{ ok: false, failure: { kind: 'no-key' } }}
      />
    );
    expect(html).toContain('운영 앱 기록');
    expect(html).toContain('$0.04');
    expect(html).toContain('OPENAI_ADMIN_KEY');
    expect(html).toContain('로컬·테스트 비용은 빠져 있어요');
    expect(html).not.toContain('실제 청구 (로컬·운영·테스트 합산)');
  });

  it('권한 오류면 키를 다시 확인하라고 — 일반 키를 넣은 경우', () => {
    const html = renderToStaticMarkup(
      <CostDashboard
        summary={summary}
        actual={{ ok: false, failure: { kind: 'forbidden' } }}
      />
    );
    expect(html).toContain('관리자 키(sk-admin-)인지');
  });
});
