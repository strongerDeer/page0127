import { toKstDateKey } from '@/shared/lib/date';

/**
 * 어드민 화면들이 함께 쓰는 "조회 기간" — URL 의 ?range=7d|30d|custom&from=&to= 를 해석한다.
 *
 * 왜 URL 인가:
 * 기간을 상태(useState)로 들고 있으면 새로고침·공유 때마다 기본값으로 돌아가고,
 * 서버 컴포넌트가 그 기간으로 바로 조회할 수 없다. searchParams 로 두면 서버가 읽어
 * 그대로 조회하고, "10/1~10/15 유입분석" 같은 링크를 그대로 다시 열 수 있다.
 *
 * 오늘은 어떻게 다루나:
 * 오늘·1주·1달 프리셋은 모두 **오늘까지**다(HJ, 2026-10-31 — "오늘이 빠지면 지금 상황이 안 보인다").
 * 오늘이 들면 includesToday 가 true 라 화면이 "집계 중" 안내를 띄운다.
 * 앞 기간 대비 증감은 반나절 오늘을 꽉 찬 하루와 견주면 무조건 줄어 보이므로,
 * comparableRange(어제까지로 자른 기간)와 그 바로 앞 같은 길이 기간으로 센다.
 * 오늘 하루만 고르면 견줄 끝난 날이 없어 증감을 숨긴다.
 *
 * 날짜는 전부 KST 'YYYY-MM-DD' 다(user_daily_visits.visit_date 와 같은 기준).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type RangePreset = 'today' | '7d' | '30d' | 'custom';

export const PRESET_DAYS: Record<Exclude<RangePreset, 'custom'>, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
};

/** 사용자 지정 최대 길이 — GA 일별 보고서 한 번에 받을 수 있는 정도, 1년 */
export const MAX_RANGE_DAYS = 366;

export type DateRange = {
  preset: RangePreset;
  /** 첫날 (KST, 포함) */
  from: string;
  /** 마지막 날 (KST, 포함) — 오늘 이하 */
  to: string;
  /** 오늘(KST)이 들어 있다 — 아직 집계 중이라 숫자가 계속 늘어난다 */
  includesToday: boolean;
  /** from~to 날짜 수 */
  days: number;
  /** 화면 표기 — '오늘' · '최근 7일' · '10/01 ~ 10/15' */
  label: string;
};

export type RangeSearchParams = {
  range?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' 가 실제로 있는 날짜인지 (2026-02-30 같은 값을 거른다) */
const isValidDateKey = (v: string | undefined): v is string => {
  if (!v || !DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

/** 날짜 키에 n일 더하기 (음수면 빼기). 달력 계산이라 시간대와 무관하다 */
export const addDays = (dateKey: string, n: number): string =>
  new Date(new Date(`${dateKey}T00:00:00Z`).getTime() + n * DAY_MS)
    .toISOString()
    .slice(0, 10);

/** from~to 사이 날짜 수 (양 끝 포함) */
export const daysBetween = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      DAY_MS
  ) + 1;

/** 'MM/DD' */
export const shortDate = (dateKey: string): string =>
  `${dateKey.slice(5, 7)}/${dateKey.slice(8, 10)}`;

/** 기간 안의 모든 날짜 키 — 0건인 날도 칸을 깔기 위해 쓴다 */
export const listDateKeys = ({ from, days }: DateRange): string[] =>
  Array.from({ length: days }, (_, i) => addDays(from, i));

/** KST 오늘 */
export const kstToday = (now: Date): string => toKstDateKey(now);

/** KST 어제 */
export const kstYesterday = (now: Date): string =>
  toKstDateKey(new Date(now.getTime() - DAY_MS));

const presetRange = (
  preset: Exclude<RangePreset, 'custom'>,
  now: Date
): DateRange => {
  if (preset === 'today') {
    const today = kstToday(now);
    return {
      preset,
      from: today,
      to: today,
      days: 1,
      includesToday: true,
      label: '오늘',
    };
  }
  const today = kstToday(now);
  const days = PRESET_DAYS[preset];
  return {
    preset,
    from: addDays(today, -(days - 1)),
    to: today,
    days,
    includesToday: true,
    label: `최근 ${days}일`,
  };
};

/**
 * searchParams → 기간. 잘못된 값은 오류 대신 기본 기간으로 물러난다 —
 * 손으로 고친 URL 하나 때문에 어드민 화면이 죽을 이유는 없다.
 *
 * @param now 기준 시각. 테스트가 고정 시각을 넣을 수 있게 인자로 받는다
 */
export const parseDateRange = (
  sp: RangeSearchParams,
  now: Date,
  fallback: Exclude<RangePreset, 'custom'> = '30d'
): DateRange => {
  const today = kstToday(now);
  const range = first(sp.range);

  if (range === 'today' || range === '7d' || range === '30d') {
    return presetRange(range, now);
  }

  if (range === 'custom') {
    let from = first(sp.from);
    let to = first(sp.to);
    if (!isValidDateKey(from) || !isValidDateKey(to)) {
      return presetRange(fallback, now);
    }
    // 시작·끝을 거꾸로 넣어도 뜻은 분명하다 — 바로잡아 준다
    if (from > to) [from, to] = [to, from];
    // 미래는 아직 데이터가 없다 — 오늘로 자른다(오늘은 집계 중으로 표시)
    if (to > today) to = today;
    if (from > to) from = to;
    // 너무 긴 기간은 끝을 기준으로 1년만 본다
    if (daysBetween(from, to) > MAX_RANGE_DAYS) {
      from = addDays(to, -(MAX_RANGE_DAYS - 1));
    }
    return {
      preset: 'custom',
      from,
      to,
      days: daysBetween(from, to),
      includesToday: to === today,
      label: `${shortDate(from)} ~ ${shortDate(to)}`,
    };
  }

  return presetRange(fallback, now);
};

/** 기간 → 쿼리스트링 (링크·폼이 같은 모양을 쓰게) */
export const toRangeQuery = (r: DateRange): string =>
  r.preset === 'custom'
    ? `range=custom&from=${r.from}&to=${r.to}`
    : `range=${r.preset}`;

/**
 * 바로 앞의 같은 길이 기간 — "1주를 고르면 그 전 1주"와 비교하려고 쓴다.
 * 길이가 같아야 비교가 공정하다(30일 합계를 7일 합계와 견주면 무조건 늘어 보인다).
 */
export const previousRange = (r: DateRange): DateRange => {
  const to = addDays(r.from, -1);
  const from = addDays(to, -(r.days - 1));
  return {
    preset: 'custom',
    from,
    to,
    days: r.days,
    includesToday: false,
    label: `${shortDate(from)} ~ ${shortDate(to)}`,
  };
};

/**
 * 증감 비교에 쓸 기간 — 오늘(집계 중)을 뺀 끝난 날들.
 * - 오늘이 없으면 그대로
 * - 오늘이 들면 끝을 어제로 당긴다(길이 1 줄어듦). 앞 기간도 이 기간 기준으로 잡아야 길이가 같다
 * - 오늘 하루뿐이면 null — 견줄 끝난 날이 없다
 */
export const comparableRange = (r: DateRange): DateRange | null => {
  if (!r.includesToday) return r;
  if (r.days <= 1) return null;
  const to = addDays(r.to, -1);
  return {
    preset: 'custom',
    from: r.from,
    to,
    days: r.days - 1,
    includesToday: false,
    label: `${shortDate(r.from)} ~ ${shortDate(to)}`,
  };
};

/**
 * 증감률 (cur / prev - 1). 앞 기간이 0 이면 비교할 수 없어 null —
 * 0 → 3 을 "+∞%"나 "+300%"로 쓰면 작은 숫자에서 과장이 된다.
 */
export const changeRate = (cur: number, prev: number): number | null =>
  prev === 0 ? null : cur / prev - 1;

/**
 * 기간 → timestamptz 범위 [gte, lt) (UTC ISO). created_at 같은 컬럼을 KST 날짜로 거를 때 쓴다.
 * 문자열 날짜로 비교하면 UTC 기준이 되어 KST 오전 9시 이전 것이 전날로 샌다.
 */
export const toUtcBounds = (r: DateRange): { gte: string; lt: string } => ({
  gte: new Date(`${r.from}T00:00:00+09:00`).toISOString(),
  lt: new Date(`${addDays(r.to, 1)}T00:00:00+09:00`).toISOString(),
});
