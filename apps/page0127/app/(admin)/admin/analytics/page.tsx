import { Suspense } from 'react';

import { Skeleton } from '@repo/ui';

import {
  type DateRange,
  kstToday,
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
import {
  getAdminEvents,
  getRecentAdminEvents,
} from '@/features/admin-events/api/getAdminEvents';
import { AdminEventsPanel } from '@/features/admin-events/ui/AdminEventsPanel';

import { PartialDayNotice } from '@/widgets/admin/ui/PartialDayNotice';
import { PeriodPicker } from '@/widgets/admin/ui/PeriodPicker';

// 매 요청마다 GA 를 새로 조회한다 — 관리자만 보는 화면이라 호출 수가 적다
export const dynamic = 'force-dynamic';

type AdminAnalyticsPageProps = { searchParams: Promise<RangeSearchParams> };

/**
 * 유입분석 — 머리말·기간 선택은 바로 그리고, 외부 API 를 기다리는 칸은 Suspense 로 흘려 보낸다.
 *
 * 예전에는 GA 보고서 → GA 이벤트(차례) + Search Console 을 전부 받은 뒤에야 화면이 나와
 * 메뉴를 눌러도 몇 초간 아무 반응이 없었다. 이제 받는 대로 칸마다 채워진다.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: AdminAnalyticsPageProps) {
  const now = new Date();
  const range = parseDateRange(await searchParams, now);

  // GA 두 조회는 차례로 보낸다: 동시에 보내면 보고서 배치 4개 + 이벤트 3개가 한꺼번에 나가
  // GA 속성의 동시 요청 한도에 걸린다(429 Exhausted concurrent requests quota, 2026-10-23).
  // 그래서 이벤트 칸은 보고서 Promise 를 받아 끝나길 기다린 뒤 시작한다.
  // Search Console 은 GA 한도와 무관해서 나란히 둔다
  const gaPromise = getGaReports(range);
  const eventsPromise = gaPromise.then(() => getGaEvents(range));
  const searchPromise = getSearchQueries(range);
  // 운영 기록(인스타 공유 등) — DB 라 GA 한도와 무관, 나란히
  const notesPromise = getAdminEvents(range);

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
        maxDate={kstToday(now)}
      />

      {range.includesToday && <PartialDayNotice />}

      <Suspense
        key={`notes-${range.from}-${range.to}`}
        fallback={<Skeleton className='h-24' />}
      >
        <NotesBlock
          promise={notesPromise}
          range={range}
          today={kstToday(now)}
        />
      </Suspense>

      {/* key: 기간을 바꾸면 이전 기간 숫자 대신 다시 스켈레톤을 보여 준다 */}
      <Suspense
        key={`ga-${range.from}-${range.to}`}
        fallback={<BlockSkeleton tall />}
      >
        <GaReportsBlock
          promise={gaPromise}
          notesPromise={notesPromise}
          range={range}
        />
      </Suspense>

      <Section title='가입 유도가 효과 있나?' cols={1}>
        <Suspense
          key={`ev-${range.from}-${range.to}`}
          fallback={<BlockSkeleton />}
        >
          <GaEventsBlock promise={eventsPromise} range={range} />
        </Suspense>
      </Section>

      <Section title='무엇을 검색해서 오나?' cols={1}>
        <Suspense
          key={`sc-${range.from}-${range.to}`}
          fallback={<BlockSkeleton />}
        >
          <SearchBlock promise={searchPromise} />
        </Suspense>
      </Section>
    </section>
  );
}

const BlockSkeleton = ({ tall = false }: { tall?: boolean }) => (
  <div className='space-y-3' aria-busy='true' aria-label='불러오는 중'>
    <div className='grid gap-3 sm:grid-cols-4'>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className='h-16' />
      ))}
    </div>
    <Skeleton className={tall ? 'h-64' : 'h-32'} />
  </div>
);

const NotesBlock = async ({
  promise,
  range,
  today,
}: {
  promise: ReturnType<typeof getAdminEvents>;
  range: DateRange;
  today: string;
}) => {
  const [events, recent] = await Promise.all([promise, getRecentAdminEvents()]);
  return (
    <AdminEventsPanel
      events={events}
      recent={recent}
      from={range.from}
      to={range.to}
      today={today}
    />
  );
};

const GaReportsBlock = async ({
  promise,
  notesPromise,
  range,
}: {
  promise: ReturnType<typeof getGaReports>;
  notesPromise: ReturnType<typeof getAdminEvents>;
  range: DateRange;
}) => {
  const [ga, notes] = await Promise.all([promise, notesPromise]);
  return ga.status === 'ok' ? (
    <GaInsightsView
      reports={ga.reports}
      range={range}
      previousSummary={ga.previousSummary}
      comparableSummary={ga.comparableSummary}
      events={notes ?? []}
    />
  ) : (
    <SetupNotice
      source='GA4'
      missing={ga.status === 'unconfigured' ? ga.missing : undefined}
      error={ga.status === 'error' ? ga.message : undefined}
    />
  );
};

const GaEventsBlock = async ({
  promise,
  range,
}: {
  promise: ReturnType<typeof getGaEvents>;
  range: DateRange;
}) => {
  const events = await promise;
  return events.status === 'ok' ? (
    <div className='space-y-3'>
      <EventFunnelPanel
        range={events.current}
        previous={events.previous}
        comparable={events.comparable}
        excludesToday={range.includesToday && events.comparable}
        events={events.events}
        ctaLocations={events.ctaLocations}
        dbSignups={events.dbSignups}
      />
      <HeroAbPanel range={range} rows={events.heroAb} />
    </div>
  ) : (
    <SetupNotice
      source='GA4'
      missing={events.status === 'unconfigured' ? events.missing : undefined}
      error={events.status === 'error' ? events.message : undefined}
    />
  );
};

const SearchBlock = async ({
  promise,
}: {
  promise: ReturnType<typeof getSearchQueries>;
}) => {
  const search = await promise;
  return search.status === 'ok' ? (
    <SearchQueryTable rows={search.rows} />
  ) : (
    <SetupNotice
      source='Search Console'
      missing={search.status === 'unconfigured' ? search.missing : undefined}
      error={search.status === 'error' ? search.message : undefined}
    />
  );
};
