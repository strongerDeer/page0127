import type { GaRow } from './ga4Reports';
import type { DateRange } from '@/shared/lib/admin/dateRange';

/**
 * 가입 유도 개편(2026-10-08~12) 효과 측정 — GA 이벤트를 깔때기 순서로 센다.
 *
 * 이름은 shared/lib/analytics/trackEvent.ts 의 AnalyticsEvent 와 같아야 한다.
 * 거기서 이름을 바꾸면 GA 에선 새 이벤트라 여기도 함께 바꾼다.
 *
 * 현재 기간과 바로 앞 같은 길이 기간을 한 요청(dateRanges 2개)으로 받는다 —
 * "개편 뒤 2주 vs 앞 2주"를 기간 선택 하나로 본다.
 */
export const FUNNEL_EVENTS = [
  { name: 'shelf_preview_pick', label: '맛보기에서 책 고름' },
  { name: 'shelf_preview_save', label: '맛보기 책장 저장' },
  { name: 'shelf_preview_goal', label: '맛보기 목표 저장 (0권)' },
  { name: 'cta_click', label: 'CTA 클릭' },
  { name: 'signup_start', label: '가입 버튼' },
  { name: 'sign_up', label: '가입 완료 (온보딩)' },
  { name: 'book_add', label: '책 담기' },
  { name: 'book_complete', label: '완독 전환' },
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[number]['name'];

const CURRENT = 'current';
const PREVIOUS = 'previous';

const dateRanges = (range: DateRange, prev: DateRange) => [
  { startDate: range.from, endDate: range.to, name: CURRENT },
  { startDate: prev.from, endDate: prev.to, name: PREVIOUS },
];

/** 이벤트별 횟수·사용자 */
export const toEventsRequest = (range: DateRange, prev: DateRange) => ({
  dateRanges: dateRanges(range, prev),
  dimensions: [{ name: 'eventName' }],
  metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
  dimensionFilter: {
    filter: {
      fieldName: 'eventName',
      inListFilter: { values: FUNNEL_EVENTS.map((e) => e.name) },
    },
  },
  limit: 50,
});

/**
 * CTA 위치별 클릭 — trackEvent('cta_click', { location }) 의 location.
 * ⚠️ GA 관리 > 맞춤 정의 에 이벤트 범위 측정기준 `location` 이 등록돼 있어야 받을 수 있다.
 * 없으면 GA 가 400 을 주므로, 다른 보고서와 묶지 않고 따로 보낸다.
 */
export const toCtaLocationRequest = (range: DateRange, prev: DateRange) => ({
  dateRanges: dateRanges(range, prev),
  dimensions: [{ name: 'customEvent:location' }],
  metrics: [{ name: 'eventCount' }],
  dimensionFilter: {
    filter: {
      fieldName: 'eventName',
      stringFilter: { value: 'cta_click' },
    },
  },
  limit: 20,
});

export type PeriodPair = { current: number; previous: number };

export type EventRow = {
  name: string;
  label: string;
  count: PeriodPair;
  users: PeriodPair;
};

/**
 * dateRanges 를 2개 주면 GA 는 마지막 차원으로 'dateRange'(= 위에서 준 name)를 붙여 돌려준다.
 * 그 열로 현재/이전을 가른다.
 */
const splitByRange = (
  rows: GaRow[] = [],
  metricCount: number
): Map<string, { current: number[]; previous: number[] }> => {
  const out = new Map<string, { current: number[]; previous: number[] }>();
  for (const r of rows) {
    const dims = (r.dimensionValues ?? []).map((d) => d.value ?? '');
    const key = dims[0] ?? '';
    const which = dims.at(-1) === PREVIOUS ? 'previous' : 'current';
    const values = (r.metricValues ?? []).map((m) => Number(m.value ?? 0));
    let entry = out.get(key);
    if (!entry) {
      entry = {
        current: Array(metricCount).fill(0),
        previous: Array(metricCount).fill(0),
      };
      out.set(key, entry);
    }
    entry[which] = values;
  }
  return out;
};

/** 이벤트 응답 → 깔때기 순서의 행. GA 가 0건이라 빼먹은 이벤트도 0 으로 남긴다 */
export const parseEvents = (rows?: GaRow[]): EventRow[] => {
  const byName = splitByRange(rows, 2);
  return FUNNEL_EVENTS.map(({ name, label }) => {
    const e = byName.get(name);
    return {
      name,
      label,
      count: { current: e?.current[0] ?? 0, previous: e?.previous[0] ?? 0 },
      users: { current: e?.current[1] ?? 0, previous: e?.previous[1] ?? 0 },
    };
  });
};

export type CtaLocationRow = { location: string; count: PeriodPair };

export const parseCtaLocations = (rows?: GaRow[]): CtaLocationRow[] =>
  [...splitByRange(rows, 1).entries()]
    .map(([location, v]) => ({
      location:
        location === '(not set)' || location === '' ? '(알 수 없음)' : location,
      count: { current: v.current[0] ?? 0, previous: v.previous[0] ?? 0 },
    }))
    .sort((a, b) => b.count.current - a.count.current);
