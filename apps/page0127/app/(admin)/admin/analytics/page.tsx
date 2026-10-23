import {
  kstYesterday,
  parseDateRange,
  type RangeSearchParams,
} from '@/shared/lib/admin/dateRange';

import { getGaEvents } from '@/features/admin-analytics/api/getGaEvents';
import { getGaReports } from '@/features/admin-analytics/api/getGaReports';
import { getSearchQueries } from '@/features/admin-analytics/api/getSearchQueries';
import { EventFunnelPanel } from '@/features/admin-analytics/ui/EventFunnelPanel';
import {
  GaInsightsView,
  Section,
} from '@/features/admin-analytics/ui/GaInsightsView';
import { HeroAbPanel } from '@/features/admin-analytics/ui/HeroAbPanel';
import { SearchQueryTable } from '@/features/admin-analytics/ui/SearchQueryTable';
import { SetupNotice } from '@/features/admin-analytics/ui/SetupNotice';

import { PeriodPicker } from '@/widgets/admin/ui/PeriodPicker';

// 매 요청마다 GA 를 새로 조회한다 — 관리자만 보는 화면이라 호출 수가 적다
export const dynamic = 'force-dynamic';

type AdminAnalyticsPageProps = { searchParams: Promise<RangeSearchParams> };

export default async function AdminAnalyticsPage({
  searchParams,
}: AdminAnalyticsPageProps) {
  const now = new Date();
  const range = parseDateRange(await searchParams, now);

  // 두 연동은 서로 독립 — 하나가 실패해도 다른 하나는 보여 준다.
  // GA 두 조회는 차례로 보낸다: 동시에 보내면 보고서 배치 4개 + 이벤트 3개가 한꺼번에 나가
  // GA 속성의 동시 요청 한도에 걸린다(429 Exhausted concurrent requests quota, 2026-10-23).
  // Search Console 은 GA 한도와 무관해서 나란히 둔다
  const [[ga, events], search] = await Promise.all([
    getGaReports(range).then(
      async (reports) => [reports, await getGaEvents(range)] as const
    ),
    getSearchQueries(range),
  ]);

  return (
    <section className='space-y-6'>
      <div>
        <h1 className='text-base font-medium'>유입분석</h1>
        <p className='mt-1 text-sm text-text-subtle'>
          {range.label}({range.from} ~ {range.to}) · GA4 · Search Console.
          검색어는 2~3일 늦게 들어와 마지막 며칠이 비는 게 정상입니다.{' '}
          <a
            href='https://analytics.google.com/'
            target='_blank'
            rel='noopener noreferrer'
            className='underline'
          >
            GA 콘솔에서 더 보기
          </a>
        </p>
      </div>

      <PeriodPicker
        basePath='/admin/analytics'
        range={range}
        maxDate={kstYesterday(now)}
      />

      {ga.status === 'ok' ? (
        <GaInsightsView
          reports={ga.reports}
          range={range}
          previousSummary={ga.previousSummary}
        />
      ) : (
        <SetupNotice
          source='GA4'
          missing={ga.status === 'unconfigured' ? ga.missing : undefined}
          error={ga.status === 'error' ? ga.message : undefined}
        />
      )}

      <Section title='가입 유도가 효과 있나?' cols={1}>
        {events.status === 'ok' ? (
          <div className='space-y-3'>
            <EventFunnelPanel
              range={range}
              previous={events.previous}
              events={events.events}
              ctaLocations={events.ctaLocations}
              dbSignups={events.dbSignups}
            />
            <HeroAbPanel range={range} rows={events.heroAb} />
          </div>
        ) : (
          <SetupNotice
            source='GA4'
            missing={
              events.status === 'unconfigured' ? events.missing : undefined
            }
            error={events.status === 'error' ? events.message : undefined}
          />
        )}
      </Section>

      <Section title='무엇을 검색해서 오나?' cols={1}>
        {search.status === 'ok' ? (
          <SearchQueryTable rows={search.rows} />
        ) : (
          <SetupNotice
            source='Search Console'
            missing={
              search.status === 'unconfigured' ? search.missing : undefined
            }
            error={search.status === 'error' ? search.message : undefined}
          />
        )}
      </Section>
    </section>
  );
}
