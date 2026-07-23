import { MONTHLY_BUDGET_KRW, USD_TO_KRW } from '@/shared/lib/admin/config';

import {
  computeBudgetUsage,
  formatKrw,
  formatUsd,
} from '@/features/admin-costs/lib/cost';

import type { CostSummary } from '@/features/admin-costs/api/getCostSummary';

export const CostDashboard = ({ summary }: { summary: CostSummary }) => {
  const usage = computeBudgetUsage(summary.monthTotalCents, {
    usdToKrw: USD_TO_KRW,
    budgetKrw: MONTHLY_BUDGET_KRW,
  });

  return (
    <div className='flex flex-col gap-6'>
      {/* 예산 게이지 */}
      <section className='rounded border border-line p-4'>
        <div className='text-sm text-text-subtle'>이번 달 AI 비용</div>
        <div className='mt-1 text-lg font-semibold'>
          {formatUsd(usage.usd)} ≈ {formatKrw(usage.krw)} /{' '}
          {formatKrw(usage.budgetKrw)} ({usage.percent}%)
        </div>
        <div className='mt-2 h-2 w-full border border-line'>
          <div
            className='h-full bg-primary'
            style={{ width: `${Math.min(usage.percent, 100)}%` }}
          />
        </div>
      </section>

      {/* 기능별 분해 */}
      <section className='grid gap-4 sm:grid-cols-2'>
        {(['taste', 'compatibility'] as const).map((f) => (
          <div key={f} className='rounded border border-line p-4'>
            <div className='text-sm font-semibold'>
              {f === 'taste' ? '취향 분석' : '궁합 분석'}
            </div>
            <div className='mt-1 text-sm text-text-subtle'>
              {summary.byFeature[f].count}회 ·{' '}
              {formatUsd(summary.byFeature[f].cents / 100)}
            </div>
          </div>
        ))}
      </section>

      {/* 일별 추이 */}
      <section className='rounded border border-line p-4'>
        <div className='text-sm font-semibold'>일별 추이 (이번 달)</div>
        {summary.daily.length === 0 ? (
          <p className='mt-2 text-sm text-text-subtle'>
            아직 이번 달 사용 내역이 없습니다.
          </p>
        ) : (
          <ul className='mt-2 flex flex-col gap-1 text-sm'>
            {summary.daily.map((d) => (
              <li key={d.date} className='flex justify-between'>
                <span className='text-text-subtle'>{d.date}</span>
                <span>{formatUsd(d.cents / 100)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 사용자별 호출 순위 */}
      <section className='rounded border border-line p-4'>
        <div className='text-sm font-semibold'>많이 쓴 사용자 (호출 횟수)</div>
        {summary.topUsers.length === 0 ? (
          <p className='mt-2 text-sm text-text-subtle'>데이터 없음</p>
        ) : (
          <ol className='mt-2 flex flex-col gap-1 text-sm'>
            {summary.topUsers.map((u, i) => (
              <li key={u.userId} className='flex justify-between'>
                <span className='text-text-subtle'>
                  {i + 1}. {u.userId.slice(0, 8)}…
                </span>
                <span>{u.count}회</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};
