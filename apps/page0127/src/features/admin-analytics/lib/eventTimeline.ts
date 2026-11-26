import { addDays, type DateRange } from '@/shared/lib/admin/dateRange';

import type { GaRow } from './ga4Reports';
import type { AnalyticsEvent } from '@/shared/lib/analytics/trackEvent';

/**
 * 유입분석 '이벤트 현황' — 어떤 GA 이벤트가 언제 났나.
 *
 * 이름은 trackEvent.ts 의 AnalyticsEvent 에서만 고를 수 있게 타입을 묶었다(오타·옛 이름 방지).
 * 새 이벤트를 심으면 여기에 한 줄 넣어야 판에 나온다 — 넣지 않은 이벤트는 GA 에 묻지 않는다.
 * 묶음 순서 = 화면 순서. 'GA 자동'(page_view 등)은 숫자가 커서 판을 덮으니 넣지 않는다.
 */
export const EVENT_GROUPS: {
  key: string;
  label: string;
  events: { name: AnalyticsEvent; label: string }[];
}[] = [
  {
    key: 'sentence',
    label: '오늘의 문장',
    events: [
      { name: 'daily_sentence_draw', label: '뽑기' },
      { name: 'daily_sentence_copy', label: '문장 복사' },
    ],
  },
  {
    key: 'typing',
    label: '온라인 필사',
    events: [
      { name: 'typing_start', label: '필사 시작' },
      { name: 'typing_page_complete', label: '쪽 완료' },
      { name: 'typing_chapter_complete', label: '장 완료' },
      { name: 'typing_rank_join', label: '랭킹 등록' },
    ],
  },
  {
    key: 'home',
    label: '홈 책·케미',
    events: [
      { name: 'home_page_turn', label: '홈 책 넘김' },
      { name: 'home_book_jump', label: '목차·건너뛰기' },
      { name: 'home_sound_toggle', label: '넘김 소리' },
      { name: 'chemistry_run', label: '케미 분석' },
      { name: 'chemistry_notify', label: '케미 알리기' },
    ],
  },
  {
    key: 'signup',
    label: '가입',
    events: [
      { name: 'shelf_preview_save', label: '맛보기 저장' },
      { name: 'cta_click', label: 'CTA 클릭' },
      { name: 'login_start', label: '로그인 버튼' },
      { name: 'sign_up', label: '가입 완료' },
      { name: 'first_books_save', label: '첫 책 고름' },
    ],
  },
  {
    key: 'books',
    label: '책·기록',
    events: [
      { name: 'book_add', label: '책 담기' },
      { name: 'book_complete', label: '완독 전환' },
      { name: 'book_barcode_scan', label: '바코드' },
      { name: 'book_import', label: '여러 권 담기' },
      { name: 'rating_nudge_save', label: '별점 남김' },
      { name: 'taste_analysis_run', label: '취향 분석' },
      { name: 'records_export', label: '기록 내려받기' },
      { name: 'quote_save', label: '문장 저장' },
      { name: 'review_save', label: '한 줄 독후감' },
      { name: 'book_search', label: '도서 검색' },
    ],
  },
  {
    key: 'social',
    label: '소셜·리그',
    events: [
      { name: 'follow_add', label: '팔로우' },
      { name: 'follow_remove', label: '언팔로우' },
      { name: 'like_add', label: '좋아요' },
      { name: 'comment_post', label: '댓글' },
      { name: 'reader_search', label: '리더 검색' },
      { name: 'league_discover', label: '리그 비교 열기' },
      { name: 'league_nudge', label: '콕 찌르기' },
    ],
  },
  {
    key: 'return',
    label: '다시 오게',
    events: [
      { name: 'recap_view', label: '주간 회상' },
      { name: 'badge_earn', label: '배지 받음' },
      { name: 'push_enable', label: '알림 켜기' },
      { name: 'push_disable', label: '알림 끄기' },
    ],
  },
  {
    key: 'spread',
    label: '공유·앱',
    events: [
      { name: 'share_click', label: '공유' },
      { name: 'install_guide_open', label: '설치 방법 열기' },
      { name: 'install_prompt', label: '설치 창 답함' },
      { name: 'app_open', label: '홈 화면 앱 열기' },
      { name: 'app_install', label: '앱 설치' },
    ],
  },
];

export const CATALOG_EVENTS = EVENT_GROUPS.flatMap((g) => g.events);
const CATALOG_NAMES = CATALOG_EVENTS.map((e) => e.name);

/** 이 칸 수를 넘는 긴 기간은 마지막 날들만 칸으로 그린다(30일이면 한 줄에 들어간다) */
export const MAX_HEAT_DAYS = 31;

const eventFilter = {
  filter: {
    fieldName: 'eventName',
    inListFilter: { values: CATALOG_NAMES },
  },
};

/** 그릴 날짜들 — 기간이 길면 끝에서 MAX_HEAT_DAYS 일만 */
export const heatDays = (range: DateRange): string[] => {
  const days = Math.min(range.days, MAX_HEAT_DAYS);
  const start = addDays(range.to, -(days - 1));
  return Array.from({ length: days }, (_, i) => addDays(start, i));
};

/** 이벤트 × 날짜별 횟수 */
export const toDailyEventsRequest = (days: string[]) => ({
  dateRanges: [{ startDate: days[0], endDate: days.at(-1) }],
  dimensions: [{ name: 'eventName' }, { name: 'date' }],
  metrics: [{ name: 'eventCount' }],
  dimensionFilter: eventFilter,
  limit: 5000,
});

/**
 * 이벤트 × 시간(오늘·어제) — 사람이 적어도 "몇 시에 무엇이 났나"가 보이는 칸.
 * GA 속성 시간대(한국)의 dateHour('YYYYMMDDHH')로 받는다.
 */
export const toHourlyEventsRequest = (today: string) => ({
  dateRanges: [{ startDate: addDays(today, -1), endDate: today }],
  dimensions: [{ name: 'eventName' }, { name: 'dateHour' }],
  metrics: [{ name: 'eventCount' }],
  dimensionFilter: eventFilter,
  limit: 5000,
});

/** 'YYYYMMDD' → 'YYYY-MM-DD' */
const toDateKey = (v: string) =>
  `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;

export type TimelineRow = {
  name: string;
  label: string;
  /** 칸마다 횟수 — 날짜 칸이면 days 순서, 시간 칸이면 [어제 0~23시, 오늘 0~23시] */
  counts: number[];
  total: number;
};

export type TimelineGroup = { key: string; label: string; rows: TimelineRow[] };

const toGroups = (counts: Map<string, number[]>, size: number) =>
  EVENT_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    rows: g.events.map((e) => {
      const c = counts.get(e.name) ?? Array<number>(size).fill(0);
      return {
        name: e.name,
        label: e.label,
        counts: c,
        total: c.reduce((s, v) => s + v, 0),
      };
    }),
  }));

/** 날짜 칸 — 0건인 날도 칸을 깐다 */
export const parseDailyEvents = (
  rows: GaRow[] = [],
  days: string[]
): TimelineGroup[] => {
  const index = new Map(days.map((d, i) => [d, i]));
  const counts = new Map<string, number[]>();
  for (const r of rows) {
    const [name = '', date = ''] = (r.dimensionValues ?? []).map(
      (d) => d.value ?? ''
    );
    const i = index.get(toDateKey(date));
    if (i === undefined) continue;
    const c = counts.get(name) ?? Array<number>(days.length).fill(0);
    c[i] += Number(r.metricValues?.[0]?.value ?? 0);
    counts.set(name, c);
  }
  return toGroups(counts, days.length);
};

/** 시간 칸 48개 — 앞 24칸 어제, 뒤 24칸 오늘 */
export const parseHourlyEvents = (
  rows: GaRow[] = [],
  today: string
): TimelineGroup[] => {
  const yesterday = addDays(today, -1);
  const counts = new Map<string, number[]>();
  for (const r of rows) {
    const [name = '', dateHour = ''] = (r.dimensionValues ?? []).map(
      (d) => d.value ?? ''
    );
    const day = toDateKey(dateHour);
    const hour = Number(dateHour.slice(8, 10));
    const base = day === today ? 24 : day === yesterday ? 0 : -1;
    if (base < 0 || !Number.isInteger(hour) || hour < 0 || hour > 23) continue;
    const c = counts.get(name) ?? Array<number>(48).fill(0);
    c[base + hour] += Number(r.metricValues?.[0]?.value ?? 0);
    counts.set(name, c);
  }
  return toGroups(counts, 48);
};

/**
 * 칸 색 진하기 0~4. 판 전체 최댓값 기준이면 cta_click 같은 큰 이벤트가 작은 이벤트를 다 흐리게 만들어서
 * **줄마다** 그 줄의 최댓값으로 나눈다 — "이 이벤트가 언제 몰렸나"를 보는 판이다.
 */
export const heatLevel = (count: number, rowMax: number): 0 | 1 | 2 | 3 | 4 => {
  if (count <= 0 || rowMax <= 0) return 0;
  const ratio = count / rowMax;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
};

/** 실시간(지난 30분) — 이벤트별 횟수. 목록에 있는 이벤트만, 많은 순 */
export const toRealtimeEventsRequest = () => ({
  dimensions: [{ name: 'eventName' }],
  metrics: [{ name: 'eventCount' }],
  dimensionFilter: eventFilter,
  limit: 20,
});

export type RealtimeEventRow = { name: string; label: string; count: number };

export const parseRealtimeEvents = (rows: GaRow[] = []): RealtimeEventRow[] => {
  const labels = new Map(
    CATALOG_EVENTS.map((e) => [e.name as string, e.label])
  );
  return rows
    .map((r) => {
      const name = r.dimensionValues?.[0]?.value ?? '';
      return {
        name,
        label: labels.get(name) ?? name,
        count: Number(r.metricValues?.[0]?.value ?? 0),
      };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
};

/** 기간 안 이벤트별 횟수·사용자 합계 — 어드민 홈 기능별 카드의 GA 깔때기에 쓴다 */
export const toEventTotalsRequest = (range: DateRange, names: string[]) => ({
  dateRanges: [{ startDate: range.from, endDate: range.to }],
  dimensions: [{ name: 'eventName' }],
  metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
  dimensionFilter: {
    filter: { fieldName: 'eventName', inListFilter: { values: names } },
  },
  limit: 50,
});

export type EventTotals = Record<string, { count: number; users: number }>;

/** GA 가 0건이라 빼먹은 이벤트도 0 으로 채운다 */
export const parseEventTotals = (
  rows: GaRow[] = [],
  names: string[]
): EventTotals => {
  const out: EventTotals = Object.fromEntries(
    names.map((name) => [name, { count: 0, users: 0 }])
  );
  for (const r of rows) {
    const name = r.dimensionValues?.[0]?.value ?? '';
    if (!(name in out)) continue;
    out[name] = {
      count: Number(r.metricValues?.[0]?.value ?? 0),
      users: Number(r.metricValues?.[1]?.value ?? 0),
    };
  }
  return out;
};
