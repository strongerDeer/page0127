import {
  kstToday,
  parseDateRange,
  type RangeSearchParams,
} from '@/shared/lib/admin/dateRange';

import {
  GaInsightsView,
  Section,
} from '@/features/admin-analytics/ui/GaInsightsView';
import { RealtimePanel } from '@/features/admin-analytics/ui/RealtimePanel';
import { SearchQueryTable } from '@/features/admin-analytics/ui/SearchQueryTable';
import { SignupChannelPanel } from '@/features/admin-analytics/ui/SignupChannelPanel';

import { PartialDayNotice } from '@/widgets/admin/ui/PartialDayNotice';
import { PeriodPicker } from '@/widgets/admin/ui/PeriodPicker';
import { DemoPanel } from '@/widgets/demo-admin';
import { assertDemoViewer } from '@/widgets/demo-admin/api/assertDemoViewer';
import {
  DEMO_REALTIME,
  DEMO_SEARCH_QUERIES,
  demoGaReports,
  demoSignupChannels,
} from '@/widgets/demo-admin/model/demoAnalytics';
import { buildDemoPopulation } from '@/widgets/demo-admin/model/demoPopulation';

export const dynamic = 'force-dynamic';

type DemoAnalyticsPageProps = { searchParams: Promise<RangeSearchParams> };

/**
 * 데모 유입분석 — 실제 /admin/analytics 와 같은 패널. GA·Search Console 을 부르지 않고
 * 응답 모양만 같은 예시를 넣는다. 이벤트 깔때기·이벤트 현황·히어로 A/B 칸은 뺐다
 * (GA 맞춤 측정기준에 묶인 칸이라 예시로 만들면 실제와 어긋나기 쉽다).
 */
export default async function DemoAnalyticsPage({
  searchParams,
}: DemoAnalyticsPageProps) {
  await assertDemoViewer();
  const now = new Date();
  const range = parseDateRange(await searchParams, now);
  const population = buildDemoPopulation(now);
  const ga = demoGaReports(population, range);

  return (
    <section className='space-y-6'>
      <div>
        <h1 className='text-base font-medium'>유입분석</h1>
        <p className='mt-1 text-sm text-text-subtle'>
          {range.label}({range.from} ~ {range.to}) · GA4 · Search Console 화면을
          예시 숫자로 채웠어요.
        </p>
      </div>

      <DemoPanel>
        <RealtimePanel result={DEMO_REALTIME} />
      </DemoPanel>

      <PeriodPicker
        basePath='/demo/admin/analytics'
        range={range}
        maxDate={kstToday(now)}
      />

      {range.includesToday && <PartialDayNotice />}

      <Section title='가입한 사람은 어디서 왔나?' cols={1}>
        <DemoPanel>
          <SignupChannelPanel result={demoSignupChannels(population, range)} />
        </DemoPanel>
      </Section>

      <DemoPanel>
        <GaInsightsView
          reports={ga.reports}
          range={range}
          previousSummary={ga.previousSummary}
          comparableSummary={ga.comparableSummary}
        />
      </DemoPanel>

      <Section title='무엇을 검색해서 오나?' cols={1}>
        <DemoPanel>
          <SearchQueryTable rows={DEMO_SEARCH_QUERIES} />
        </DemoPanel>
      </Section>
    </section>
  );
}
