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
  { name: 'shelf_preview_view', label: '맛보기 히어로 봄' },
  { name: 'shelf_preview_pick', label: '맛보기에서 책 고름' },
  { name: 'shelf_preview_save', label: '맛보기 책장 저장' },
  { name: 'shelf_preview_goal', label: '맛보기 목표 저장 (0권)' },
  { name: 'cta_click', label: 'CTA 클릭' },
  { name: 'signup_start', label: '가입 버튼' },
  { name: 'login_start', label: '로그인 버튼 (구글·카카오)' },
  { name: 'sign_up', label: '가입 완료 (온보딩)' },
  { name: 'shelf_preview_claim', label: '맛보기 책 서재에 담김' },
  {
    name: 'shelf_preview_decline',
    label: '맛보기 책 담기 거절 (공용 PC 확인)',
  },
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

/**
 * 홈 히어로 A/B 깔때기 단계 — docs/superpowers/specs/2026-10-23-life-book-hero-ab-design.md 7절.
 * 기존 회원은 sign_up 없이 login_start → shelf_preview_claim 으로 간다(그래서 "신규만").
 */
export const HERO_AB_STEPS = [
  { name: 'shelf_preview_view', label: '히어로 봄' },
  { name: 'shelf_preview_pick', label: '고름 (B: 찾음)' },
  { name: 'shelf_preview_save', label: '저장 (B: 등록하기)' },
  { name: 'login_start', label: '로그인 버튼' },
  { name: 'sign_up', label: '가입 완료 (신규만)' },
  { name: 'shelf_preview_claim', label: '서재에 담김' },
] as const;

/** 한쪽이라도 첫 단계 사용자가 이보다 적으면 비교를 미룬다 */
export const HERO_AB_MIN_USERS = 30;

/**
 * 단계 × 그룹별 사용자 수. 그룹은 GA 사용자 속성 hero_variant(사용자 범위 맞춤 측정기준).
 * ⚠️ 측정기준이 등록되기 전에는 GA 가 400 을 주므로 다른 보고서와 묶지 않는다.
 * 실험은 같은 기간 안에서 A·B 를 비교한다 — 앞 기간은 요청하지 않는다.
 */
export const toHeroAbRequest = (range: DateRange) => ({
  dateRanges: [{ startDate: range.from, endDate: range.to }],
  dimensions: [{ name: 'eventName' }, { name: 'customUser:hero_variant' }],
  metrics: [{ name: 'totalUsers' }],
  dimensionFilter: {
    filter: {
      fieldName: 'eventName',
      inListFilter: { values: HERO_AB_STEPS.map((s) => s.name) },
    },
  },
  limit: 50,
});

export type HeroAbRow = { name: string; label: string; a: number; b: number };

/** 그룹이 없는 사용자("(not set)" — 실험 밖)는 세지 않는다 */
export const parseHeroAb = (rows: GaRow[] = []): HeroAbRow[] => {
  const users = new Map<string, { a: number; b: number }>();
  for (const r of rows) {
    const [name = '', variant = ''] = (r.dimensionValues ?? []).map(
      (d) => d.value ?? ''
    );
    if (variant !== 'a' && variant !== 'b') continue;
    const entry = users.get(name) ?? { a: 0, b: 0 };
    entry[variant] += Number(r.metricValues?.[0]?.value ?? 0);
    users.set(name, entry);
  }
  return HERO_AB_STEPS.map(({ name, label }) => ({
    name,
    label,
    a: users.get(name)?.a ?? 0,
    b: users.get(name)?.b ?? 0,
  }));
};
