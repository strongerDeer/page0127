import { Suspense } from 'react';

import { ErrorBoundary } from '@repo/ui';

import { MONTHLY_BUDGET_KRW, USD_TO_KRW } from '@/shared/lib/admin/config';

import { getCostSummary } from '@/features/admin-costs/api/getCostSummary';
import { computeBudgetUsage } from '@/features/admin-costs/lib/cost';
import { getOverview } from '@/features/admin-overview/api/getOverview';
import { getTrends } from '@/features/admin-overview/api/getTrends';
import { buildAttention } from '@/features/admin-overview/lib/attention';
import { sumPoints } from '@/features/admin-overview/lib/trend';
import { AttentionList } from '@/features/admin-overview/ui/AttentionList';
import { OverviewCards } from '@/features/admin-overview/ui/OverviewCards';
import { TrendBars } from '@/features/admin-overview/ui/TrendBars';
import { getLatestRegressionCount } from '@/features/admin-quality/api/getLatestRegressionCount';

// 지표는 매번 새로 읽는다. 어드민은 방금 일어난 일을 보러 오는 화면이라
// 캐시된 숫자를 보여주면 "왜 안 늘지"로 시간을 쓴다.
export const dynamic = 'force-dynamic';

/**
 * 여러 feature(신고·품질·AI 비용)를 한 화면에 모으는 일은 page(app 계층)가 한다.
 * FSD 에서 feature 끼리는 서로 import 하지 않는다 — 조합은 위 계층의 몫이다.
 */
const OverviewSection = async () => {
  const [overview, regressions, cost] = await Promise.all([
    getOverview(),
    getLatestRegressionCount(),
    // AI 비용 조회가 실패해도 홈 전체가 죽지 않게 null 로 물러난다
    getCostSummary().catch((e: unknown) => {
      console.error('[admin] 홈 AI 비용 조회 실패:', e);
      return null;
    }),
  ]);

  const attention = buildAttention({
    pendingReports: overview.pendingReports,
    qualityRegressions: regressions,
    aiBudgetPercent: cost
      ? computeBudgetUsage(cost.monthTotalCents, {
          usdToKrw: USD_TO_KRW,
          budgetKrw: MONTHLY_BUDGET_KRW,
        }).percent
      : null,
  });

  return (
    <div className='space-y-8'>
      <AttentionList items={attention} />
      <OverviewCards overview={overview} />
    </div>
  );
};

const TrendSection = async () => {
  const trends = await getTrends();
  if (!trends) {
    // null = 조회 실패. "30일 동안 0건"으로 보이면 안 된다
    return (
      <p className='rounded-lg border border-line p-4 text-sm text-text-subtle'>
        추이를 불러오지 못했습니다. (데이터가 없는 것과는 다른 상태입니다 — 서버
        로그를 확인하세요.)
      </p>
    );
  }
  const avgVisitors = sumPoints(trends.visitors) / trends.visitors.length;
  return (
    <section>
      <h2 className='mb-3 text-sm font-medium'>
        최근 30일{' '}
        <span className='font-normal text-text-subtle'>(어제까지)</span>
      </h2>
      <div className='grid gap-3 lg:grid-cols-3'>
        <TrendBars
          title='방문자'
          unit='명'
          points={trends.visitors}
          summary={`하루 평균 ${avgVisitors.toFixed(1)}명`}
        />
        <TrendBars
          title='가입'
          unit='명'
          points={trends.signups}
          summary={`합계 ${sumPoints(trends.signups)}명`}
        />
        <TrendBars
          title='책 등록'
          unit='권'
          points={trends.books}
          summary={`합계 ${sumPoints(trends.books)}권`}
        />
      </div>
    </section>
  );
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

export default function AdminHomePage() {
  // 두 구역은 따로 실패한다 — 추이 조회가 죽어도 "오늘 볼 것"은 보여야 한다.
  // 다른 화면으로의 이동은 왼쪽 메뉴가 맡아서, 홈에 바로가기 카드를 따로 두지 않는다.
  return (
    <div className='space-y-8'>
      <ErrorBoundary fallback={<FailNotice />}>
        <Suspense fallback={<Skeleton height='h-48' />}>
          <OverviewSection />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<FailNotice />}>
        <Suspense fallback={<Skeleton height='h-40' />}>
          <TrendSection />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
