import {
  changeRate,
  kstToday,
  parseDateRange,
  type RangeSearchParams,
} from '@/shared/lib/admin/dateRange';

import { sumPoints } from '@/features/admin-overview/lib/trend';
import { peakHour } from '@/features/admin-overview/lib/visitHours';
import { AttentionList } from '@/features/admin-overview/ui/AttentionList';
import { FunnelPanel } from '@/features/admin-overview/ui/FunnelPanel';
import { OverviewCards } from '@/features/admin-overview/ui/OverviewCards';
import { RetentionPanel } from '@/features/admin-overview/ui/RetentionPanel';
import { TrendBars } from '@/features/admin-overview/ui/TrendBars';

import { PartialDayNotice } from '@/widgets/admin/ui/PartialDayNotice';
import { PeriodPicker } from '@/widgets/admin/ui/PeriodPicker';
import { DemoPanel } from '@/widgets/demo-admin';
import { assertDemoViewer } from '@/widgets/demo-admin/api/assertDemoViewer';
import {
  demoAttention,
  demoFunnel,
  demoOverview,
  demoRetention,
  demoTrends,
} from '@/widgets/demo-admin/model/demoOverview';
import { buildDemoPopulation } from '@/widgets/demo-admin/model/demoPopulation';

// 로그인한 체험 계정인지 요청마다 본다(쿠키) — 정적으로 굽지 않는다
export const dynamic = 'force-dynamic';

type DemoAdminHomeProps = { searchParams: Promise<RangeSearchParams> };

/**
 * 데모 대시보드 — 실제 /admin 과 같은 패널, 숫자만 가상의 회원 기록에서 센다.
 * 실제 화면의 "운영 기록" 칸은 저장 버튼(서버 액션)이 붙어 있어 뺐고,
 * "새 기능 사용" 칸은 GA 이벤트 집계가 필요해 뺐다.
 */
export default async function DemoAdminHomePage({
  searchParams,
}: DemoAdminHomeProps) {
  await assertDemoViewer();
  const now = new Date();
  const range = parseDateRange(await searchParams, now);
  const population = buildDemoPopulation(now);

  const overview = demoOverview(population, now);
  const trends = demoTrends(population, range);
  const { retention, hours } = demoRetention(population, range, now);
  const funnel = demoFunnel(population, range, now);

  const avgVisitors = sumPoints(trends.visitors) / trends.visitors.length;
  const cmp = trends.comparison;
  const vs = (key: 'visitors' | 'signups' | 'books'): string => {
    if (!cmp) return '';
    const r = changeRate(cmp.current[key], cmp.previous[key]);
    if (r === null) return '';
    const p = Math.round(r * 100);
    return ` · 앞 기간 ${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(p)}%`;
  };
  const peak = peakHour(hours);

  return (
    <div className='space-y-8'>
      <div className='space-y-8'>
        <DemoPanel>
          <AttentionList items={demoAttention()} />
        </DemoPanel>
        <DemoPanel>
          <OverviewCards overview={overview} />
        </DemoPanel>
      </div>

      <div className='space-y-6 border-t border-line pt-6'>
        <PeriodPicker
          basePath='/demo/admin'
          range={range}
          maxDate={kstToday(now)}
        />

        <DemoPanel>
          <section>
            <h2 className='mb-3 text-sm font-medium'>
              추이{' '}
              <span className='font-normal text-text-subtle'>
                ({range.label} · {range.from} ~ {range.to})
              </span>
            </h2>
            {range.includesToday && (
              <div className='mb-3'>
                <PartialDayNotice />
              </div>
            )}
            <div className='grid gap-3 lg:grid-cols-3'>
              <TrendBars
                title='DAU (로그인 회원)'
                unit='명'
                points={trends.visitors}
                summary={`하루 평균 ${avgVisitors.toFixed(1)}명${vs('visitors')} · 운영자 제외`}
              />
              <TrendBars
                title='가입'
                unit='명'
                points={trends.signups}
                summary={`합계 ${sumPoints(trends.signups)}명${vs('signups')} · 운영자 제외`}
              />
              <TrendBars
                title='책 등록'
                unit='권'
                points={trends.books}
                summary={`합계 ${sumPoints(trends.books)}권${vs('books')} · 운영자 제외`}
              />
            </div>
          </section>
        </DemoPanel>

        <DemoPanel>
          <div className='space-y-3'>
            <RetentionPanel retention={retention} periodLabel={range.label} />
            <TrendBars
              title='그날 첫 방문 시각 (KST)'
              unit='명'
              points={hours}
              summary={
                peak === null
                  ? '방문 없음'
                  : `가장 많은 시각 ${peak}시 · 알림 발송 시각 근거`
              }
            />
          </div>
        </DemoPanel>

        <DemoPanel>
          <FunnelPanel funnel={funnel} periodLabel={range.label} />
        </DemoPanel>
      </div>
    </div>
  );
}
