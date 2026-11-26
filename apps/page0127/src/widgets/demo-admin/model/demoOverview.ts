import {
  comparableRange,
  type DateRange,
  kstYesterday,
  previousRange,
} from '@/shared/lib/admin/dateRange';
import { toKstDateKey } from '@/shared/lib/date';

import {
  summarizeActivity,
  summarizeBeta,
} from '@/features/admin-overview/lib/activity';
import {
  type AttentionItem,
  buildAttention,
} from '@/features/admin-overview/lib/attention';
import {
  computeFunnel,
  type FunnelSummary,
} from '@/features/admin-overview/lib/funnel';
import { resolveMetricPeriod } from '@/features/admin-overview/lib/period';
import { computeRetention } from '@/features/admin-overview/lib/retention';
import { bucketByDay } from '@/features/admin-overview/lib/trend';
import { bucketByKstHour } from '@/features/admin-overview/lib/visitHours';

import { DEMO_QUALITY_REGRESSIONS } from './demoQuality';

import type { DemoPopulation } from './demoPopulation';
import type { AdminOverview } from '@/features/admin-overview/api/getOverview';
import type { RetentionData } from '@/features/admin-overview/api/getRetention';
import type { AdminTrends } from '@/features/admin-overview/api/getTrends';

/**
 * 대시보드(/demo/admin) 숫자 — 실제 getOverview·getTrends·getRetention·getFunnel 과 같은 계산을
 * DB 행 대신 가상의 회원 기록(demoPopulation)에 돌린다.
 *
 * 반환 타입은 실제 api 의 타입을 `import type` 으로 빌려 쓴다. 타입은 빌드 때 지워져서
 * DB 를 여는 코드가 데모 번들에 딸려 오지 않고, 패널 props 가 바뀌면 여기서 타입 에러가 난다.
 */

const kstKey = (iso: string) => toKstDateKey(new Date(iso));

export const demoOverview = (p: DemoPopulation, now: Date): AdminOverview => {
  const period = resolveMetricPeriod(now);
  const { today, yesterday, monthStart } = period;
  const bookKeys = p.books.map((b) => kstKey(b.created_at));
  return {
    yesterday,
    today,
    // 신고 화면은 데모에 없다 — 0 이면 "오늘 볼 것"에 신고 줄이 안 생긴다
    pendingReports: 0,
    activity: summarizeActivity(
      p.visits.filter((v) => v.visit_date >= monthStart),
      period
    ),
    beta: summarizeBeta(
      p.members.map((m) => ({ id: m.id, createdAt: kstKey(m.createdAt) })),
      p.books.map((b) => b.user_id),
      p.visits.filter((v) => v.visit_date >= monthStart),
      period,
      p.pushUserIds
    ),
    members: {
      yesterday: p.members.filter((m) => kstKey(m.createdAt) === yesterday)
        .length,
    },
    books: {
      total: p.books.length,
      yesterday: bookKeys.filter((k) => k === yesterday).length,
    },
    completions: {
      yesterday: p.books.filter((b) => b.completed_date === yesterday).length,
    },
  };
};

/** "오늘 볼 것" — 링크는 데모 안의 같은 화면으로 바꾼다(실제 /admin 은 체험 계정에게 404) */
export const demoAttention = (): AttentionItem[] =>
  buildAttention({
    pendingReports: 0,
    qualityRegressions: DEMO_QUALITY_REGRESSIONS,
    aiBudgetPercent: 34,
  }).map((item) => ({
    ...item,
    href: item.href.replace(/^\/admin/, '/demo/admin'),
  }));

const countIn = (keys: string[], r: DateRange): number =>
  keys.filter((k) => k >= r.from && k <= r.to).length;

export const demoTrends = (
  p: DemoPopulation,
  range: DateRange
): AdminTrends => {
  const comparable = comparableRange(range);
  const previous = previousRange(comparable ?? range);
  const visitKeys = p.visits.map((v) => v.visit_date);
  const signupKeys = p.members.map((m) => kstKey(m.createdAt));
  const bookKeys = p.books.map((b) => kstKey(b.created_at));
  return {
    visitors: bucketByDay(visitKeys, range),
    signups: bucketByDay(signupKeys, range),
    books: bucketByDay(bookKeys, range),
    comparison: comparable && {
      current: {
        visitors: countIn(visitKeys, comparable),
        signups: countIn(signupKeys, comparable),
        books: countIn(bookKeys, comparable),
      },
      previous: {
        visitors: countIn(visitKeys, previous),
        signups: countIn(signupKeys, previous),
        books: countIn(bookKeys, previous),
      },
    },
  };
};

export const demoRetention = (
  p: DemoPopulation,
  range: DateRange,
  now: Date
): RetentionData => {
  const yesterday = kstYesterday(now);
  const visitsUntil = range.to > yesterday ? range.to : yesterday;
  const visits = p.visits.filter(
    (v) => v.visit_date >= range.from && v.visit_date <= visitsUntil
  );
  const signups = p.members
    .map((m) => ({ id: m.id, signupDate: kstKey(m.createdAt) }))
    .filter((m) => m.signupDate >= range.from && m.signupDate <= range.to);
  return {
    retention: computeRetention(visits, signups, range, yesterday),
    hours: bucketByKstHour(
      visits
        .filter((v) => v.visit_date <= range.to)
        .map((v) => v.first_visit_at)
    ),
  };
};

export const demoFunnel = (
  p: DemoPopulation,
  range: DateRange,
  now: Date
): FunnelSummary => {
  const signups = p.members.filter((m) => {
    const key = kstKey(m.createdAt);
    return key >= range.from && key <= range.to;
  });
  const ids = new Set(signups.map((m) => m.id));
  return computeFunnel(
    signups,
    p.books.filter((b) => ids.has(b.user_id)),
    now
  );
};
