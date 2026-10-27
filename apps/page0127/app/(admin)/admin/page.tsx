import { Suspense } from 'react';

import { ErrorBoundary } from '@repo/ui';

import { MONTHLY_BUDGET_KRW, USD_TO_KRW } from '@/shared/lib/admin/config';
import {
  changeRate,
  type DateRange,
  kstYesterday,
  parseDateRange,
  type RangeSearchParams,
  toRangeQuery,
} from '@/shared/lib/admin/dateRange';

import { getCostSummary } from '@/features/admin-costs/api/getCostSummary';
import { getOpenAiCosts } from '@/features/admin-costs/api/getOpenAiCosts';
import {
  budgetBasisCents,
  computeBudgetUsage,
} from '@/features/admin-costs/lib/cost';
import { getFunnel } from '@/features/admin-overview/api/getFunnel';
import { getOverview } from '@/features/admin-overview/api/getOverview';
import { getRetention } from '@/features/admin-overview/api/getRetention';
import { getTrends } from '@/features/admin-overview/api/getTrends';
import { buildAttention } from '@/features/admin-overview/lib/attention';
import { sumPoints } from '@/features/admin-overview/lib/trend';
import { peakHour } from '@/features/admin-overview/lib/visitHours';
import { AttentionList } from '@/features/admin-overview/ui/AttentionList';
import { FunnelPanel } from '@/features/admin-overview/ui/FunnelPanel';
import { OverviewCards } from '@/features/admin-overview/ui/OverviewCards';
import { RetentionPanel } from '@/features/admin-overview/ui/RetentionPanel';
import { TrendBars } from '@/features/admin-overview/ui/TrendBars';
import { getLatestRegressionCount } from '@/features/admin-quality/api/getLatestRegressionCount';

import { PeriodPicker } from '@/widgets/admin/ui/PeriodPicker';

// 지표는 매번 새로 읽는다. 어드민은 방금 일어난 일을 보러 오는 화면이라
// 캐시된 숫자를 보여주면 "왜 안 늘지"로 시간을 쓴다.
export const dynamic = 'force-dynamic';

/**
 * 여러 feature(신고·품질·AI 비용)를 한 화면에 모으는 일은 page(app 계층)가 한다.
 * FSD 에서 feature 끼리는 서로 import 하지 않는다 — 조합은 위 계층의 몫이다.
 */
const OverviewSection = async () => {
  const [overview, regressions, cost, actualCost] = await Promise.all([
    getOverview(),
    getLatestRegressionCount(),
    // AI 비용 조회가 실패해도 홈 전체가 죽지 않게 null 로 물러난다
    getCostSummary().catch((e: unknown) => {
      console.error('[admin] 홈 AI 비용 조회 실패:', e);
      return null;
    }),
    // 예산 경고는 AI 비용 화면과 같은 기준 — 실제 청구(로컬·테스트 포함)와 앱 기록 중 큰 쪽
    getOpenAiCosts(),
  ]);

  const attention = buildAttention({
    pendingReports: overview.pendingReports,
    qualityRegressions: regressions,
    aiBudgetPercent: cost
      ? computeBudgetUsage(
          budgetBasisCents(
            cost.monthTotalCents,
            actualCost.ok ? actualCost.costs.totalCents : null
          ),
          { usdToKrw: USD_TO_KRW, budgetKrw: MONTHLY_BUDGET_KRW }
        ).percent
      : null,
  });

  return (
    <div className='space-y-8'>
      <AttentionList items={attention} />
      <OverviewCards overview={overview} />
    </div>
  );
};

type RangeProps = { range: DateRange };

const TrendSection = async ({ range }: RangeProps) => {
  const trends = await getTrends(range);
  if (!trends) {
    // null = 조회 실패. "그 기간 동안 0건"으로 보이면 안 된다
    return (
      <p className='rounded-lg border border-line p-4 text-sm text-text-subtle'>
        추이를 불러오지 못했습니다. (데이터가 없는 것과는 다른 상태입니다 — 서버
        로그를 확인하세요.)
      </p>
    );
  }
  const avgVisitors = sumPoints(trends.visitors) / trends.visitors.length;
  // 앞 같은 길이 기간 대비 — 길이가 같아 합계 비교가 곧 평균 비교다
  const vs = (cur: number, prev: number): string => {
    const r = changeRate(cur, prev);
    if (r === null) return '';
    const p = Math.round(r * 100);
    return ` · 앞 기간 ${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(p)}%`;
  };
  return (
    <section>
      <h2 className='mb-3 text-sm font-medium'>
        추이{' '}
        <span className='font-normal text-text-subtle'>
          ({range.label} · {range.from} ~ {range.to})
        </span>
      </h2>
      <div className='grid gap-3 lg:grid-cols-3'>
        <TrendBars
          title='DAU (로그인 회원)'
          unit='명'
          points={trends.visitors}
          summary={`하루 평균 ${avgVisitors.toFixed(1)}명${vs(sumPoints(trends.visitors), trends.previous.visitors)} · 운영자 제외`}
        />
        <TrendBars
          title='가입'
          unit='명'
          points={trends.signups}
          summary={`합계 ${sumPoints(trends.signups)}명${vs(sumPoints(trends.signups), trends.previous.signups)} · 운영자 제외`}
        />
        <TrendBars
          title='책 등록'
          unit='권'
          points={trends.books}
          summary={`합계 ${sumPoints(trends.books)}권${vs(sumPoints(trends.books), trends.previous.books)} · 운영자 제외`}
        />
      </div>
    </section>
  );
};

const RetentionSection = async ({ range }: RangeProps) => {
  const data = await getRetention(range);
  if (!data) {
    return (
      <p className='rounded-lg border border-line p-4 text-sm text-text-subtle'>
        재방문 지표를 불러오지 못했습니다. (재방문 0% 와는 다른 상태입니다 —
        서버 로그를 확인하세요.)
      </p>
    );
  }
  const peak = peakHour(data.hours);
  return (
    <div className='space-y-3'>
      <RetentionPanel retention={data.retention} periodLabel={range.label} />
      {/* 푸시·알림 발송 시각을 정할 근거 — D-1 이 first_visit_at 을 남긴 이유 */}
      <TrendBars
        title='그날 첫 방문 시각 (KST)'
        unit='명'
        points={data.hours}
        summary={
          peak === null
            ? '방문 없음'
            : `가장 많은 시각 ${peak}시 · 알림 발송 시각 근거`
        }
      />
    </div>
  );
};

const FunnelSection = async ({ range }: RangeProps) => {
  const funnel = await getFunnel(range);
  if (!funnel) {
    return (
      <p className='rounded-lg border border-line p-4 text-sm text-text-subtle'>
        가입 퍼널을 불러오지 못했습니다. (전환 0% 와는 다른 상태입니다 — 서버
        로그를 확인하세요.)
      </p>
    );
  }
  return <FunnelPanel funnel={funnel} periodLabel={range.label} />;
};

type SkeletonProps = { height: string };

const Skeleton = ({ height }: SkeletonProps) => (
  <div
    className={`${height} animate-pulse rounded-lg border border-line bg-sunken`}
  />
);

const FailNotice = () => (
  <p className='rounded-lg border border-line p-4 text-sm text-text-subtle'>
    지표를 불러오지 못했습니다.
  </p>
);

type AdminHomePageProps = { searchParams: Promise<RangeSearchParams> };

export default async function AdminHomePage({
  searchParams,
}: AdminHomePageProps) {
  const now = new Date();
  const range = parseDateRange(await searchParams, now);
  // 기간을 바꾸면 이전 기간 숫자가 남아 있지 않게 스켈레톤부터 다시 보인다
  const rangeKey = toRangeQuery(range);

  // 구역마다 따로 실패한다 — 추이 조회가 죽어도 "오늘 볼 것"은 보여야 한다.
  // 다른 화면으로의 이동은 왼쪽 메뉴가 맡아서, 홈에 바로가기 카드를 따로 두지 않는다.
  // 위 "어제·누적"은 매일 아침 보는 고정 숫자라 기간 선택과 무관하고, 기간은 아래 구역만 바꾼다.
  return (
    <div className='space-y-8'>
      <ErrorBoundary fallback={<FailNotice />}>
        <Suspense fallback={<Skeleton height='h-48' />}>
          <OverviewSection />
        </Suspense>
      </ErrorBoundary>

      <div className='space-y-6 border-t border-line pt-6'>
        <PeriodPicker
          basePath='/admin'
          range={range}
          maxDate={kstYesterday(now)}
        />

        <ErrorBoundary fallback={<FailNotice />}>
          <Suspense key={rangeKey} fallback={<Skeleton height='h-40' />}>
            <TrendSection range={range} />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary fallback={<FailNotice />}>
          <Suspense key={rangeKey} fallback={<Skeleton height='h-56' />}>
            <RetentionSection range={range} />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary fallback={<FailNotice />}>
          <Suspense key={rangeKey} fallback={<Skeleton height='h-40' />}>
            <FunnelSection range={range} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
