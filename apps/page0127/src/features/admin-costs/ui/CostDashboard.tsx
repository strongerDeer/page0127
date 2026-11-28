import { adminInk } from '@/shared/lib/admin/adminChartColors';
import {
  AI_BUDGET_WARN_PERCENT,
  MONTHLY_BUDGET_KRW,
  USD_TO_KRW,
} from '@/shared/lib/admin/config';

import {
  budgetBasisCents,
  computeBudgetUsage,
  formatKrw,
  formatUsd,
  mergeDailyCosts,
} from '@/features/admin-costs/lib/cost';

import type {
  AiCostsFailure,
  AiCostsResult,
} from '@/features/admin-costs/api/getAiCosts';
import type { CostSummary } from '@/features/admin-costs/api/getCostSummary';

type CostDashboardProps = {
  summary: CostSummary;
  /** Anthropic 조직 실제 청구액(로컬·운영·테스트 합산) — 못 읽으면 실패 사유 */
  actual: AiCostsResult;
};

/**
 * 실제 청구액을 못 읽었을 때, 화면의 숫자에서 무엇이 빠졌는지 한 줄로.
 *
 * 키 없음·권한 없음은 고장이 아니다 — 개인 Console 계정은 Admin API 를 쓸 수 없어서
 * (2026-11-28 확인, 서비스 계정 키도 forbidden) 앞으로도 이 상태가 기본이다.
 * 그래서 "설정이 빠졌다"가 아니라 "실제 청구는 Console 에서"로 안내한다.
 */
const CONSOLE_NOTICE = '운영 앱 기록이에요. 로컬·테스트까지 합친 실제 청구액은';
const FAILURE_NOTICE: Record<AiCostsFailure['kind'], string> = {
  'no-key': CONSOLE_NOTICE,
  forbidden: CONSOLE_NOTICE,
  error:
    'Anthropic 실제 청구액을 불러오지 못해 운영 앱 기록만 보여요. 실제 청구액은',
};
// 이번 달(month to date) 비용 화면 — 2026-11-28 HJ가 Console 주소창에서 확인
const CONSOLE_URL = 'https://platform.claude.com/cost?range=mtd';

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
  // 일별은 앱 기록과 실제 청구를 나란히 — 실제 청구는 반영이 늦어 오늘 운영 사용이 빠지고,
  // 앱 기록만으로는 운영 밖에서 쓴 날이 안 보인다
  const daily = mergeDailyCosts(
    summary.daily,
    actual.ok ? actual.costs.daily : null
  );

  const maxDaily = Math.max(
    0,
    ...daily.map((d) => Math.max(d.appCents, d.actualCents ?? 0))
  );

  return (
    <div className='flex flex-col gap-6'>
      {/* 예산 게이지 */}
      <section className='rounded border border-line p-4'>
        <div className='text-sm text-text-subtle'>
          이번 달 AI 비용 ·{' '}
          {actual.ok ? '실제 청구 (로컬·운영·테스트 합산)' : '운영 앱 기록'}
        </div>
        <div className='mt-1 flex flex-wrap items-baseline gap-x-2'>
          <span className='text-2xl font-bold tabular-nums text-text-strong'>
            {formatKrw(usage.krw)}
          </span>
          <span className='text-sm text-text-subtle tabular-nums'>
            / {formatKrw(usage.budgetKrw)} · {formatUsd(usage.usd)}
          </span>
        </div>
        {/* 예산 게이지 — 경고선(80%)을 그어 두고, 넘으면 색이 바뀐다 (HJ, 2026-11-24) */}
        <div
          className='relative mt-3 h-3 w-full rounded-full bg-sunken'
          role='meter'
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(usage.percent, 100)}
          aria-label={`예산의 ${usage.percent}% 사용`}
        >
          <div
            className='h-full rounded-full'
            style={{
              width: `${Math.min(usage.percent, 100)}%`,
              background:
                usage.percent >= AI_BUDGET_WARN_PERCENT
                  ? '#f0a94c'
                  : `linear-gradient(90deg, ${adminInk.mint}, ${adminInk.primary})`,
            }}
          />
          <span
            aria-hidden
            className='absolute -top-1 -bottom-1 w-0.5 rounded bg-text-strong/60'
            style={{ left: `${AI_BUDGET_WARN_PERCENT}%` }}
          />
        </div>
        <p className='mt-1.5 text-xs tabular-nums'>
          <span
            className={
              usage.percent >= 100
                ? 'font-medium text-destructive'
                : usage.percent >= AI_BUDGET_WARN_PERCENT
                  ? 'font-medium text-[#8a4b00] dark:text-[#f0a94c]'
                  : 'text-text-subtle'
            }
          >
            {usage.percent}%
            {usage.percent >= 100
              ? ' · 예산 넘음'
              : usage.percent >= AI_BUDGET_WARN_PERCENT
                ? ` · 경고선(${AI_BUDGET_WARN_PERCENT}%) 넘음`
                : ` · 경고선 ${AI_BUDGET_WARN_PERCENT}%까지 여유`}
          </span>
        </p>
        <p className='mt-2 text-xs text-text-subtle'>
          {actual.ok ? (
            `운영 앱 기록 ${formatUsd(summary.monthTotalCents / 100)} · 그 밖(로컬·테스트 등) ${formatUsd(otherCents / 100)}. 실제 청구는 반영이 몇 시간 늦을 수 있어 앱 기록보다 작으면 앱 기록으로 계산해요.`
          ) : (
            <>
              {FAILURE_NOTICE[actual.failure.kind]}{' '}
              <a
                href={CONSOLE_URL}
                target='_blank'
                rel='noreferrer'
                className='underline underline-offset-2'
              >
                Claude Console → 비용
              </a>
              에서 볼 수 있어요.
            </>
          )}
        </p>
      </section>

      {/* 기능별 분해 */}
      <section className='grid gap-4 sm:grid-cols-2'>
        {(['taste', 'compatibility'] as const).map((f) => {
          const cents = summary.byFeature[f].cents;
          const share =
            summary.monthTotalCents > 0 ? cents / summary.monthTotalCents : 0;
          const color = f === 'taste' ? adminInk.primary : adminInk.violet;
          return (
            <div key={f} className='rounded border border-line p-4'>
              <div className='flex items-center gap-2 text-sm font-medium'>
                <span
                  aria-hidden
                  className='h-2.5 w-2.5 rounded-sm'
                  style={{ backgroundColor: color }}
                />
                {f === 'taste' ? '취향 분석' : '케미 분석'}
              </div>
              <div className='mt-1 text-sm text-text-subtle tabular-nums'>
                {summary.byFeature[f].count}회 · {formatUsd(cents / 100)} · 앱
                기록의 {Math.round(share * 100)}%
              </div>
              <div className='mt-2 h-1.5 rounded-full bg-sunken'>
                <div
                  className='h-full rounded-full'
                  style={{ width: `${share * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* 일별 추이 */}
      <section className='rounded border border-line p-4'>
        <div className='text-sm font-medium'>일별 추이 (이번 달)</div>
        {daily.length === 0 ? (
          <p className='mt-2 text-sm text-text-subtle'>
            아직 이번 달 사용 내역이 없습니다.
          </p>
        ) : (
          <table className='mt-2 w-full text-sm'>
            <thead>
              <tr className='text-xs text-text-subtle'>
                <th className='text-left font-normal'>날짜</th>
                <th className='text-right font-normal'>운영 앱 기록</th>
                {actual.ok && (
                  <th className='text-right font-normal'>실제 청구</th>
                )}
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date}>
                  <td className='py-0.5 text-text-subtle'>{d.date}</td>
                  <td className='text-right tabular-nums'>
                    {/* 숫자 옆 짧은 막대 — 어느 날 많이 썼나를 표를 읽지 않고 본다 */}
                    <span className='inline-flex items-center justify-end gap-2'>
                      <span className='hidden h-1.5 w-24 rounded-full bg-sunken sm:inline-block'>
                        <span
                          className='block h-full rounded-full'
                          style={{
                            width: `${maxDaily > 0 ? (Math.max(d.appCents, d.actualCents ?? 0) / maxDaily) * 100 : 0}%`,
                            backgroundColor: adminInk.primary,
                          }}
                        />
                      </span>
                      {formatUsd(d.appCents / 100)}
                    </span>
                  </td>
                  {d.actualCents !== null && (
                    <td className='text-right'>
                      {formatUsd(d.actualCents / 100)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {actual.ok && (
          <p className='mt-2 text-xs text-text-subtle'>
            실제 청구는 몇 시간~하루 늦게 들어오고 UTC 하루 단위라, 방금 돌린
            분석은 운영 앱 기록에 먼저 보여요.
          </p>
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
