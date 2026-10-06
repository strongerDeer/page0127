import { getGaReports } from '@/features/admin-analytics/api/getGaReports';
import { getSearchQueries } from '@/features/admin-analytics/api/getSearchQueries';
import {
  GaInsightsView,
  Section,
} from '@/features/admin-analytics/ui/GaInsightsView';
import { SearchQueryTable } from '@/features/admin-analytics/ui/SearchQueryTable';
import { SetupNotice } from '@/features/admin-analytics/ui/SetupNotice';

// 매 요청마다 GA 를 새로 조회한다 — 관리자만 보는 화면이라 호출 수가 적다
export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  // 두 연동은 서로 독립 — 하나가 실패해도 다른 하나는 보여 준다
  const [ga, search] = await Promise.all([getGaReports(), getSearchQueries()]);

  return (
    <section className='space-y-6'>
      <div>
        <h1 className='text-base font-medium'>유입분석</h1>
        <p className='mt-1 text-sm text-text-subtle'>
          최근 28일(어제까지) · GA4 · Search Console.{' '}
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

      {ga.status === 'ok' ? (
        <GaInsightsView reports={ga.reports} now={new Date()} />
      ) : (
        <SetupNotice
          source='GA4'
          missing={ga.status === 'unconfigured' ? ga.missing : undefined}
          error={ga.status === 'error' ? ga.message : undefined}
        />
      )}

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
