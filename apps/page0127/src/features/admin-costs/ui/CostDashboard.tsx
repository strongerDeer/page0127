import { MONTHLY_BUDGET_KRW, USD_TO_KRW } from '@/shared/lib/admin/config';

import {
  budgetBasisCents,
  computeBudgetUsage,
  formatKrw,
  formatUsd,
} from '@/features/admin-costs/lib/cost';

import type { CostSummary } from '@/features/admin-costs/api/getCostSummary';
import type {
  OpenAiCostsFailure,
  OpenAiCostsResult,
} from '@/features/admin-costs/api/getOpenAiCosts';

type CostDashboardProps = {
  summary: CostSummary;
  /** OpenAI 조직 실제 청구액(로컬·운영·테스트 합산) — 못 읽으면 실패 사유 */
  actual: OpenAiCostsResult;
};

/** 실제 청구액을 못 읽었을 때, 화면의 숫자에서 무엇이 빠졌는지 한 줄로 */
const FAILURE_NOTICE: Record<OpenAiCostsFailure['kind'], string> = {
  'no-key':
    'OpenAI 관리자 키(OPENAI_ADMIN_KEY)가 없어 운영 앱 기록만 보여요. 로컬·테스트 비용은 빠져 있어요.',
  forbidden:
    'OpenAI 실제 청구액을 읽을 권한이 없어요. OPENAI_ADMIN_KEY 가 관리자 키(sk-admin-)인지 확인해 주세요. 로컬·테스트 비용은 빠져 있어요.',
  error:
    'OpenAI 실제 청구액을 불러오지 못해 운영 앱 기록만 보여요. 로컬·테스트 비용은 빠져 있어요.',
};

export const CostDashboard = ({ summary, actual }: CostDashboardProps) => {
  const actualCents = actual.ok ? actual.costs.totalCents : null;
  const usage = computeBudgetUsage(
    budgetBasisCents(summary.monthTotalCents, actualCents),
    { usdToKrw: USD_TO_KRW, budgetKrw: MONTHLY_BUDGET_KRW }
  );
  // 실제 청구 − 운영 앱 기록 = 로컬·개발 DB·테스트 등 운영 DB 밖에서 쓴 돈
  const otherCents =
    actualCents === null
      ? 0
      : Math.max(actualCents - summary.monthTotalCents, 0);
  // 일별도 실제 청구가 있으면 그것으로 — 운영 밖에서 쓴 날이 보인다
  const daily = actual.ok ? actual.costs.daily : summary.daily;

  return (
    <div className='flex flex-col gap-6'>
      {/* 예산 게이지 */}
      <section className='rounded border border-line p-4'>
        <div className='text-sm text-text-subtle'>
          이번 달 AI 비용 ·{' '}
          {actual.ok ? '실제 청구 (로컬·운영·테스트 합산)' : '운영 앱 기록'}
        </div>
        <div className='mt-1 text-lg font-medium'>
          {formatUsd(usage.usd)} ≈ {formatKrw(usage.krw)} /{' '}
          {formatKrw(usage.budgetKrw)} ({usage.percent}%)
        </div>
        <div className='mt-2 h-2 w-full border border-line'>
          <div
            className='h-full bg-primary'
            style={{ width: `${Math.min(usage.percent, 100)}%` }}
          />
        </div>
        <p className='mt-2 text-xs text-text-subtle'>
          {actual.ok
            ? `운영 앱 기록 ${formatUsd(summary.monthTotalCents / 100)} · 그 밖(로컬·테스트 등) ${formatUsd(otherCents / 100)}. OpenAI 청구는 반영이 몇 시간 늦을 수 있어 앱 기록보다 작으면 앱 기록으로 계산해요.`
            : FAILURE_NOTICE[actual.failure.kind]}
        </p>
      </section>

      {/* 기능별 분해 */}
      <section className='grid gap-4 sm:grid-cols-2'>
        {(['taste', 'compatibility'] as const).map((f) => (
          <div key={f} className='rounded border border-line p-4'>
            <div className='text-sm font-medium'>
              {f === 'taste' ? '취향 분석' : '케미 분석'}
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
        <div className='text-sm font-medium'>
          일별 추이 (이번 달 · {actual.ok ? '실제 청구' : '운영 앱 기록'})
        </div>
        {daily.length === 0 ? (
          <p className='mt-2 text-sm text-text-subtle'>
            아직 이번 달 사용 내역이 없습니다.
          </p>
        ) : (
          <ul className='mt-2 flex flex-col gap-1 text-sm'>
            {daily.map((d) => (
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
        <div className='text-sm font-medium'>많이 쓴 사용자 (호출 횟수)</div>
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
