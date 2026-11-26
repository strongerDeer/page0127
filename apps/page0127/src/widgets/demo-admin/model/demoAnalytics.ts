import {
  comparableRange,
  type DateRange,
  listDateKeys,
  previousRange,
} from '@/shared/lib/admin/dateRange';
import { toKstDateKey } from '@/shared/lib/date';

import {
  type GaRow,
  parseReport,
  type ReportKey,
  REPORTS,
  type ReportTable,
} from '@/features/admin-analytics/lib/ga4Reports';

import type { DemoPopulation } from './demoPopulation';
import type { GaRealtimeResult } from '@/features/admin-analytics/api/getGaRealtime';
import type { SearchQueryRow } from '@/features/admin-analytics/api/getSearchQueries';
import type { SignupChannelsResult } from '@/features/admin-analytics/api/getSignupChannels';
import type { Reports } from '@/features/admin-analytics/lib/insights';
import type { SignupChannel } from '@/shared/lib/attribution/signupChannel';

/**
 * 유입분석(/demo/admin/analytics) 예시 — GA4·Search Console 응답 모양을 코드로 만든다.
 *
 * GA 응답 한 줄(GaRow)을 만들어 실제와 같은 parseReport 로 표(ReportTable)를 만든다.
 * 그래서 국가 코드 'KR' → '대한민국', 'Organic Search' → '검색' 같은 번역도 실제 화면과 같다.
 * 방문자 수는 가상 회원 방문(demoPopulation)에 가입 안 한 구경꾼을 조금 더한 크기다.
 */

const defOf = (key: ReportKey) => {
  const def = REPORTS.find((r) => r.key === key);
  if (!def) throw new Error(`정의되지 않은 GA 보고서: ${key}`);
  return def;
};

const row = (dims: string[], metrics: number[]): GaRow => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((m) => ({ value: String(m) })),
});

const table = (key: ReportKey, rows: GaRow[]): ReportTable =>
  parseReport(defOf(key), rows);

/** 날짜마다 같은 값이 나오는 작은 흔들림(0~1) — 새로고침해도 숫자가 그대로 */
const wobble = (dateKey: string, salt: number): number => {
  let h = salt;
  for (const c of dateKey) h = (h * 31 + c.charCodeAt(0)) % 1000003;
  return (h % 1000) / 1000;
};

/** 기간의 하루하루 사람 추정(한국) 방문자 — 회원 방문 + 가입 안 한 구경꾼 */
const humanDailyUsers = (p: DemoPopulation, range: DateRange) => {
  const members = new Map<string, number>();
  for (const v of p.visits) {
    if (v.visit_date >= range.from && v.visit_date <= range.to)
      members.set(v.visit_date, (members.get(v.visit_date) ?? 0) + 1);
  }
  return listDateKeys(range).map((key) => ({
    key,
    users: (members.get(key) ?? 0) + 6 + Math.round(wobble(key, 7) * 9),
  }));
};

/** 사용자 n 명을 비율대로 나눈다(합이 n 이 되게, 마지막 칸이 나머지) */
const split = (n: number, shares: number[]): number[] => {
  const out = shares.map((s) => Math.round(n * s));
  out[out.length - 1] = Math.max(
    0,
    n - out.slice(0, -1).reduce((a, b) => a + b, 0)
  );
  return out;
};

const summaryOf = (p: DemoPopulation, range: DateRange): ReportTable => {
  const daily = humanDailyUsers(p, range);
  const sum = daily.reduce((a, d) => a + d.users, 0);
  // 같은 사람이 여러 날 오므로 기간 사용자는 하루 합보다 적다. 봇·해외가 18% 쯤 섞인다
  const users = Math.round((sum * 0.62) / 0.82);
  const sessions = Math.round(sum * 1.25);
  return table('summary', [
    row([], [users, sessions, Math.round(sessions * 3.4), 0.58, 142]),
  ]);
};

export const demoGaReports = (p: DemoPopulation, range: DateRange) => {
  const daily = humanDailyUsers(p, range);
  const summary = summaryOf(p, range);
  const [users, sessions, views] = summary.rows[0].values;
  const human = Math.round(users * 0.82);
  const ga = (key: string) => key.replaceAll('-', '');
  const [mobileUsers, desktopUsers] = split(users, [0.74, 0.26]);

  const reports: Reports = {
    summary,
    daily: table(
      'daily',
      daily.map((d) =>
        row([ga(d.key)], [d.users + 2 + Math.round(wobble(d.key, 3) * 4)])
      )
    ),
    humanSummary: table('humanSummary', [
      row([], [human, Math.round(sessions * 0.85), Math.round(views * 0.88)]),
    ]),
    humanDaily: table(
      'humanDaily',
      daily.map((d) => row([ga(d.key)], [d.users]))
    ),
    channel: table(
      'channel',
      (
        [
          ['Organic Social', 0.38],
          ['Direct', 0.27],
          ['Organic Search', 0.21],
          ['Referral', 0.1],
          ['Unassigned', 0.04],
        ] as const
      ).map(([name, s]) =>
        row([name], [Math.round(sessions * s), Math.round(users * s)])
      )
    ),
    sourceMedium: table(
      'sourceMedium',
      (
        [
          ['instagram', 'social', '(not set)', 0.26],
          ['(direct)', '(none)', '(not set)', 0.27],
          ['google', 'organic', '(not set)', 0.13],
          ['threads', 'social', '(not set)', 0.12],
          ['naver', 'organic', '(not set)', 0.08],
          ['kakaotalk', 'share', 'share_library', 0.06],
          ['disquiet.io', 'referral', '(not set)', 0.05],
        ] as const
      ).map(([src, med, camp, s]) =>
        row([src, med, camp], [Math.round(sessions * s), Math.round(users * s)])
      )
    ),
    country: table('country', [
      row(['KR'], [human]),
      row(['US'], [Math.round(users * 0.12)]),
      row(['JP'], [Math.round(users * 0.03)]),
      row(['SG'], [Math.max(0, users - human - Math.round(users * 0.15))]),
    ]),
    city: table(
      'city',
      (
        [
          ['Seoul', 'KR', 0.46],
          ['Seongnam-si', 'KR', 0.1],
          ['Busan', 'KR', 0.07],
          ['Incheon', 'KR', 0.06],
          ['Daejeon', 'KR', 0.05],
          ['Ashburn', 'US', 0.08],
        ] as const
      ).map(([city, cc, s]) => row([city, cc], [Math.round(users * s)]))
    ),
    pages: table(
      'pages',
      (
        [
          ['/', 0.24],
          ['/demo_reader', 0.14],
          ['/typing/little-prince', 0.12],
          ['/sentence', 0.1],
          ['/books/all', 0.08],
          ['/blog/korea-reading-stats-2025', 0.07],
          ['/about', 0.05],
        ] as const
      ).map(([path, s]) =>
        row([path], [Math.round(views * s), Math.round(users * s * 1.6)])
      )
    ),
    landingBounce: table('landingBounce', [
      row(['/'], [Math.round(sessions * 0.35), 0.41]),
      row(['/demo_reader'], [Math.round(sessions * 0.18), 0.33]),
      row(['/typing/little-prince'], [Math.round(sessions * 0.12), 0.29]),
      row(
        ['/blog/korea-reading-stats-2025'],
        [Math.round(sessions * 0.08), 0.62]
      ),
    ]),
    device: table('device', [
      row(['mobile'], [mobileUsers]),
      row(['desktop'], [desktopUsers]),
    ]),
    browser: table('browser', [
      row(['Safari'], [Math.round(users * 0.46)]),
      row(['Chrome'], [Math.round(users * 0.34)]),
      row(['Samsung Internet'], [Math.round(users * 0.12)]),
      row(['Safari (in-app)'], [Math.round(users * 0.08)]),
    ]),
    os: table('os', [
      row(['iOS'], [Math.round(users * 0.52)]),
      row(['Android'], [Math.round(users * 0.22)]),
      row(['Macintosh'], [Math.round(users * 0.17)]),
      row(['Windows'], [Math.round(users * 0.09)]),
    ]),
    resolution: table('resolution', [
      row(['390x844'], [Math.round(users * 0.28)]),
      row(['393x852'], [Math.round(users * 0.21)]),
      row(['1512x982'], [Math.round(users * 0.12)]),
      row(['412x915'], [Math.round(users * 0.1)]),
    ]),
    // 실제처럼 성별·연령은 비어 있다 — 방문자가 적으면 GA 가 숨긴다(화면이 이유를 보여 준다)
    gender: table('gender', []),
    age: table('age', []),
    shares: table('shares', [
      row(
        ['kakaotalk', 'share_library'],
        [Math.round(sessions * 0.05), Math.round(users * 0.05)]
      ),
      row(
        ['instagram', 'share_book'],
        [Math.round(sessions * 0.02), Math.round(users * 0.02)]
      ),
      row(
        ['share', 'share_library'],
        [Math.round(sessions * 0.01), Math.round(users * 0.01)]
      ),
    ]),
    newVsReturning: table('newVsReturning', [
      row(['new'], [Math.round(human * 0.64)]),
      row(['returning'], [Math.round(human * 0.36)]),
    ]),
    appUsage: table('appUsage', [
      row(
        ['app_open'],
        [Math.round(sessions * 0.09), Math.max(1, Math.round(users * 0.03))]
      ),
      row(
        ['app_install'],
        [
          Math.max(1, Math.round(users * 0.01)),
          Math.max(1, Math.round(users * 0.01)),
        ]
      ),
    ]),
  };

  const comparable = comparableRange(range);
  const previous = previousRange(comparable ?? range);
  return {
    reports,
    previousSummary: summaryOf(p, previous),
    comparableSummary: comparable ? summaryOf(p, comparable) : null,
  };
};

/** 가입한 사람은 어디서 왔나 — 기간 가입자를 정해 둔 비율로 나눈다 */
export const demoSignupChannels = (
  p: DemoPopulation,
  range: DateRange
): SignupChannelsResult => {
  const total = p.members.filter((m) => {
    const key = toKstDateKey(new Date(m.createdAt));
    return key >= range.from && key <= range.to;
  }).length;
  const channels: [SignupChannel, number][] = [
    ['인스타그램', 0.36],
    ['스레드', 0.18],
    ['구글', 0.14],
    ['직접 방문', 0.12],
    ['카카오톡', 0.1],
    ['기타 사이트', 0.1],
  ];
  const counts = split(
    total,
    channels.map(([, s]) => s)
  );
  return {
    status: 'ok',
    total,
    rows: channels
      .map(([channel], i) => ({ channel, count: counts[i] }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count),
  };
};

export const DEMO_REALTIME: GaRealtimeResult = {
  status: 'ok',
  activeUsers: 3,
  pages: [
    { title: '어린 왕자 온라인 필사 | page0127.', users: 2 },
    { title: '오늘의 문장 | page0127.', users: 1 },
  ],
  events: [
    { name: 'typing_page_complete', label: '필사 한 쪽 완료', count: 4 },
    { name: 'sentence_draw', label: '오늘의 문장 뽑기', count: 1 },
  ],
};

export const DEMO_SEARCH_QUERIES: SearchQueryRow[] = [
  {
    query: '어린왕자 필사',
    clicks: 18,
    impressions: 240,
    ctr: 0.075,
    position: 4.2,
  },
  {
    query: '온라인 필사',
    clicks: 9,
    impressions: 310,
    ctr: 0.029,
    position: 8.7,
  },
  {
    query: '독서 기록 앱',
    clicks: 6,
    impressions: 520,
    ctr: 0.012,
    position: 14.3,
  },
  {
    query: '2025 국민 독서 실태',
    clicks: 5,
    impressions: 180,
    ctr: 0.028,
    position: 6.1,
  },
  { query: '책장 기록', clicks: 3, impressions: 95, ctr: 0.032, position: 9.4 },
];
