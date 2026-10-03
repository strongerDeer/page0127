import { getGaReports } from '@/features/admin-analytics/api/getGaReports';
import { getSearchQueries } from '@/features/admin-analytics/api/getSearchQueries';
import {
  formatMetric,
  type ReportKey,
  REPORTS,
} from '@/features/admin-analytics/lib/ga4Reports';
import { ReportTableCard } from '@/features/admin-analytics/ui/ReportTableCard';
import { SearchQueryTable } from '@/features/admin-analytics/ui/SearchQueryTable';
import { SetupNotice } from '@/features/admin-analytics/ui/SetupNotice';

import type { ReactNode } from 'react';

// 매 요청마다 GA 를 새로 조회한다 — 관리자만 보는 화면이라 호출 수가 적다
export const dynamic = 'force-dynamic';

/** 화면 섹션 → 그 안에 들어갈 GA 보고서 */
const SECTIONS: { title: string; keys: ReportKey[] }[] = [
  { title: '유입', keys: ['channel', 'sourceMedium'] },
  { title: '국가·지역', keys: ['country', 'city'] },
  { title: '인기·이탈 페이지', keys: ['pages', 'landingBounce'] },
  {
    title: '방문 품질',
    keys: [
      'device',
      'browser',
      'os',
      'resolution',
      'dayOfWeek',
      'gender',
      'age',
    ],
  },
];

const defOf = (key: ReportKey) => {
  const def = REPORTS.find((r) => r.key === key);
  if (!def) throw new Error(`정의되지 않은 GA 보고서: ${key}`);
  return def;
};

export default async function AdminAnalyticsPage() {
  // 두 연동은 서로 독립 — 하나가 실패해도 다른 하나는 보여 준다
  const [ga, search] = await Promise.all([getGaReports(), getSearchQueries()]);

  const summaryDef = defOf('summary');
  const summary = ga.status === 'ok' ? ga.reports.summary.rows[0] : undefined;

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

      {ga.status !== 'ok' ? (
        <SetupNotice
          source='GA4'
          missing={ga.status === 'unconfigured' ? ga.missing : undefined}
          error={ga.status === 'error' ? ga.message : undefined}
        />
      ) : (
        <>
          {summary && (
            <dl className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
              {summaryDef.metrics.map((m, i) => (
                <div key={m.name} className='rounded-lg border border-line p-3'>
                  <dt className='text-xs text-text-subtle'>{m.label}</dt>
                  <dd className='mt-1 text-lg font-medium tabular-nums'>
                    {formatMetric(summary.values[i] ?? 0, m.format)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {SECTIONS.map((s) => (
            <Section key={s.title} title={s.title}>
              {s.keys.map((key) => (
                <ReportTableCard
                  key={key}
                  def={defOf(key)}
                  table={ga.reports[key]}
                />
              ))}
            </Section>
          ))}
        </>
      )}

      <Section title='검색어'>
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

type SectionProps = { title: string; children: ReactNode };

const Section = ({ title, children }: SectionProps) => (
  <div>
    <h2 className='mb-2 text-sm font-medium'>{title}</h2>
    <div className='grid gap-3 sm:grid-cols-2'>{children}</div>
  </div>
);
