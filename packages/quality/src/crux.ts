import type {
  FieldCwv,
  FieldHistory,
  FieldHistoryPoint,
  FieldHistorySeries,
  FieldMetricPoint,
  FieldMetrics,
  FormFactor,
} from './types.ts';

// CrUX(Chrome UX Report) = 실제 크롬 사용자에게서 수집된 필드 데이터(최근 28일, 75분위).
// 우리 Lighthouse 측정(콜드캐시·1.6Mbps·CPU 4x 랩)과는 **다른 것을 재는 다른 숫자**다.
// 합격/불합격 판정은 이 필드 수치로, 랩 수치는 주차 간 상대 비교로 쓴다.
//
// 인증: API 키를 `?key=` 쿼리 파라미터로만 받는다(OAuth Bearer 미지원 — 400으로 거절).
// 무료: GCP 프로젝트당 분당 150 쿼리. 주 1회 × 폼팩터 2 = 주당 2쿼리라 여유롭다.
const ENDPOINT = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
const HISTORY_ENDPOINT =
  'https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord';

const FORM_FACTOR_PARAM: Record<FormFactor, 'PHONE' | 'DESKTOP'> = {
  mobile: 'PHONE',
  desktop: 'DESKTOP',
};

type CruxMetric = { percentiles?: { p75?: number | string } };
type CruxRecord = {
  key: { origin?: string; url?: string; formFactor?: string };
  metrics: Record<string, CruxMetric>;
  collectionPeriod: {
    firstDate: { year: number; month: number; day: number };
    lastDate: { year: number; month: number; day: number };
  };
};

// CrUX 응답의 수치는 세 가지 모양으로 온다. 하나라도 놓치면 조용히 틀린 값이 된다:
//   1. 숫자           → 그대로 (LCP p75: 1305)
//   2. 숫자 문자열    → 변환 필요 (CLS p75: "0.00", densities: 0.9528)
//   3. 결측           → `null`(p75) 또는 **문자열 "NaN"**(densities). 표본이 임계 미만인 주.
// `Number(null)`은 **0**이라 null을 안 걸러내면 "데이터 없음"이 "완벽한 0"으로 둔갑한다.
// (같은 실수: `?? []` 폴백이 "값 없음"을 "빈 결과"로 만든 전례)
const toFinite = (raw: unknown): number | undefined => {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'string' && raw.trim() === '') return undefined;
  const n =
    typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : undefined; // "NaN" → NaN → undefined
};

const num = (m: CruxMetric | undefined): number | undefined =>
  toFinite(m?.percentiles?.p75);

const ymd = (d: { year: number; month: number; day: number }): string =>
  `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

// CrUX 응답 → 우리 스키마. 순수 함수라 단위 테스트 대상.
export const parseCruxRecord = (record: CruxRecord): FieldCwv => {
  const m = record.metrics;
  const ttfb = num(m['largest_contentful_paint_image_time_to_first_byte']);
  const loadDelay = num(m['largest_contentful_paint_image_resource_load_delay']);
  const loadDuration = num(
    m['largest_contentful_paint_image_resource_load_duration']
  );
  const renderDelay = num(
    m['largest_contentful_paint_image_element_render_delay']
  );

  const cwv: FieldCwv = {
    lcp: num(m['largest_contentful_paint']),
    inp: num(m['interaction_to_next_paint']),
    cls: num(m['cumulative_layout_shift']),
    fcp: num(m['first_contentful_paint']),
    ttfb: num(m['experimental_time_to_first_byte']),
  };

  // LCP 하위분해 — 4개가 모두 있어야 의미가 있다(합이 대략 LCP).
  // "이미지를 줄여라"(loadDuration)와 "서버가 느리다"(ttfb) 중 무엇이 진짜 병목인지 가른다.
  if (
    ttfb !== undefined &&
    loadDelay !== undefined &&
    loadDuration !== undefined &&
    renderDelay !== undefined
  ) {
    cwv.lcpBreakdown = {
      ttfbMs: ttfb,
      loadDelayMs: loadDelay,
      loadDurationMs: loadDuration,
      renderDelayMs: renderDelay,
    };
  }
  return cwv;
};

type QueryTarget = { url: string } | { origin: string };

const queryCrux = async (
  key: string,
  target: QueryTarget,
  formFactor: FormFactor
): Promise<CruxRecord | undefined> => {
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...target,
      formFactor: FORM_FACTOR_PARAM[formFactor],
    }),
  });
  // 404 = 이 URL/origin에 CrUX 임계를 넘는 트래픽이 없음. 에러가 아니라 정상 상태.
  if (res.status === 404) return undefined;
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    throw new Error(`CrUX API ${res.status}: ${body}`);
  }
  const json = (await res.json()) as { record: CruxRecord };
  return json.record;
};

// URL 단위 데이터를 먼저 시도하고, 없으면 origin 집계로 폴백한다.
// (CrUX는 자동 폴백을 하지 않는다 — 직접 두 번 물어야 한다.)
// shop 홈은 현재 URL 단위 데이터가 없어 origin 집계가 쓰인다.
export const measureField = async (
  targetUrl: string
): Promise<FieldMetrics | undefined> => {
  const key = process.env.CRUX_API_KEY;
  if (!key) {
    console.warn(
      '[quality] CRUX_API_KEY 없음 → 실사용자(필드) 지표 생략. .env.local에 키를 넣으면 수집된다.'
    );
    return undefined;
  }

  const origin = new URL(targetUrl).origin;
  const formFactors: FormFactor[] = ['mobile', 'desktop'];
  const result: FieldMetrics = {
    scope: 'url',
    target: targetUrl,
    periodStart: '',
    periodEnd: '',
  };

  for (const ff of formFactors) {
    let record = await queryCrux(key, { url: targetUrl }, ff);
    if (!record) {
      record = await queryCrux(key, { origin }, ff);
      if (record) {
        result.scope = 'origin';
        result.target = origin;
      }
    }
    if (!record) continue;

    result.periodStart = ymd(record.collectionPeriod.firstDate);
    result.periodEnd = ymd(record.collectionPeriod.lastDate);
    result[ff] = parseCruxRecord(record);
  }

  if (!result.mobile && !result.desktop) {
    console.warn(
      `[quality] CrUX 데이터 없음(${origin}) — 트래픽이 임계 미만. 필드 지표 생략.`
    );
    return undefined;
  }
  return result;
};

// ── 추세(History API) ────────────────────────────────────────────────────

// 응답의 지표 키 → 우리 키. 각 지표의 histogram bin 3개는 CWV 표준 임계와 정확히 일치한다
// (실측: LCP [0,2500)[2500,4000)[4000,∞) · INP [0,200)[200,500)[500,∞) · CLS [0,0.1)[0.1,0.25)[0.25,∞)).
// 따라서 bin0 밀도가 곧 "good 비율"이고, 합격선은 good ≥ 0.75다.
const HISTORY_METRICS = {
  lcp: 'largest_contentful_paint',
  inp: 'interaction_to_next_paint',
  cls: 'cumulative_layout_shift',
  fcp: 'first_contentful_paint',
  ttfb: 'experimental_time_to_first_byte',
} as const;

type CruxHistoryMetric = {
  percentilesTimeseries?: { p75s?: (number | string | null)[] };
  histogramTimeseries?: { densities?: (number | string | null)[] }[];
};
type CruxHistoryRecord = {
  key: { origin?: string; url?: string; formFactor?: string };
  metrics: Record<string, CruxHistoryMetric>;
  collectionPeriods: {
    firstDate: { year: number; month: number; day: number };
    lastDate: { year: number; month: number; day: number };
  }[];
};

/** i번째 주의 한 지표. 값이 하나도 없으면 undefined(0으로 채우지 않는다). */
const metricPointAt = (
  m: CruxHistoryMetric | undefined,
  i: number
): FieldMetricPoint | undefined => {
  const bins = m?.histogramTimeseries ?? [];
  const p75 = toFinite(m?.percentilesTimeseries?.p75s?.[i]);
  const good = toFinite(bins[0]?.densities?.[i]);
  const needsImprovement = toFinite(bins[1]?.densities?.[i]);
  const poor = toFinite(bins[2]?.densities?.[i]);

  const point: FieldMetricPoint = {};
  if (p75 !== undefined) point.p75 = p75;
  if (good !== undefined) point.good = good;
  if (needsImprovement !== undefined)
    point.needsImprovement = needsImprovement;
  if (poor !== undefined) point.poor = poor;
  return Object.keys(point).length > 0 ? point : undefined;
};

/**
 * History 응답 → 주간 포인트 배열. 순수 함수라 단위 테스트 대상.
 *
 * 지표가 하나도 없는 주는 **아예 버린다**. CrUX는 항상 25칸을 채워 보내되 트래픽이
 * 임계 미만이던 과거 주는 전부 결측이라, 그대로 두면 빈 앞구간이 차트를 눌러 찌그러뜨린다.
 * 반면 중간에 뚫린 구멍(INP는 25주 중 2주만 값이 있다)은 살아남고, 해당 지표만
 * undefined가 된다 → 차트에서 선을 잇지 말 것(`connectNulls={false}`).
 */
export const parseCruxHistoryRecord = (
  record: CruxHistoryRecord
): FieldHistoryPoint[] => {
  const periods = record.collectionPeriods ?? [];
  const points: FieldHistoryPoint[] = [];

  for (let i = 0; i < periods.length; i += 1) {
    const period = periods[i];
    if (!period) continue;

    const point: FieldHistoryPoint = {
      periodStart: ymd(period.firstDate),
      periodEnd: ymd(period.lastDate),
    };
    let hasAny = false;
    for (const [key, cruxKey] of Object.entries(HISTORY_METRICS)) {
      const mp = metricPointAt(record.metrics?.[cruxKey], i);
      if (mp) {
        point[key as keyof typeof HISTORY_METRICS] = mp;
        hasAny = true;
      }
    }
    if (hasAny) points.push(point);
  }
  return points;
};

const queryCruxHistory = async (
  key: string,
  target: QueryTarget,
  formFactor?: FormFactor
): Promise<CruxHistoryRecord | undefined> => {
  const res = await fetch(`${HISTORY_ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // formFactor를 **생략**하면 폼팩터 합산이다. 표본이 안 쪼개져 시계열이 가장 길다
    // (실측 2026-07-09: 합산 8주 vs PHONE/DESKTOP 각 4주). TABLET은 404라 다루지 않는다.
    body: JSON.stringify({
      ...target,
      ...(formFactor ? { formFactor: FORM_FACTOR_PARAM[formFactor] } : {}),
    }),
  });
  if (res.status === 404) return undefined;
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    throw new Error(`CrUX History API ${res.status}: ${body}`);
  }
  const json = (await res.json()) as { record: CruxHistoryRecord };
  return json.record;
};

// 합산 · 모바일 · 데스크탑. `undefined`(합산)는 폼팩터 파라미터를 생략한다는 뜻.
const SERIES_FORM_FACTORS = [undefined, 'mobile', 'desktop'] as const;

const fetchAt = async (
  key: string,
  target: QueryTarget,
  scope: 'url' | 'origin',
  targetLabel: string
): Promise<(FieldHistorySeries | undefined)[]> =>
  Promise.all(
    SERIES_FORM_FACTORS.map(async (ff) => {
      const record = await queryCruxHistory(key, target, ff);
      if (!record) return undefined;
      const points = parseCruxHistoryRecord(record);
      return points.length > 0
        ? { scope, target: targetLabel, points }
        : undefined;
    })
  );

/**
 * 폼팩터 3종(합산·모바일·데스크탑)의 주간 시계열을 가져온다.
 *
 * **세 시계열의 scope는 반드시 일치해야 한다.** 폼팩터를 합치면 표본이 커져 URL 단위
 * 임계를 넘는 경우가 있는데(실측 2026-07-09: home은 합산만 URL 데이터 2주, PHONE·DESKTOP은
 * 404 → origin 4주), 그대로 두면 대시보드의 폼팩터 토글이 **서로 다른 대상**을 비교하게 된다
 * ("전체 합산"은 홈 URL, "모바일"은 사이트 전체). 그래서 하나라도 URL 데이터가 없으면
 * 셋 다 origin으로 내린다 — 트래픽이 늘면 셋이 함께 URL로 승격된다.
 */
export const measureFieldHistory = async (
  targetUrl: string,
  now: () => string = () => new Date().toISOString()
): Promise<FieldHistory | undefined> => {
  const key = process.env.CRUX_API_KEY;
  if (!key) return undefined;

  const origin = new URL(targetUrl).origin;
  let series = await fetchAt(key, { url: targetUrl }, 'url', targetUrl);
  if (series.some((s) => !s)) {
    series = await fetchAt(key, { origin }, 'origin', origin);
  }

  const [all, mobile, desktop] = series;
  if (!all && !mobile && !desktop) {
    console.warn(`[quality] CrUX 추세 데이터 없음(${origin}).`);
    return undefined;
  }
  return {
    updatedAt: now(),
    ...(all ? { all } : {}),
    ...(mobile ? { mobile } : {}),
    ...(desktop ? { desktop } : {}),
  };
};

/**
 * 기존 시계열 + 새 응답 병합.
 *
 * History API는 **최근 25주만** 준다(롤링). 매주 덮어쓰기만 하면 26주 전 데이터가
 * 영영 사라지므로 periodEnd를 키로 upsert해 누적한다. 새 값이 이긴다(CrUX가 과거
 * 수치를 사후 보정하는 경우가 있다).
 *
 * target이 바뀌면(origin 집계 → URL 단위로 승격) 두 시계열은 **다른 것을 잰 값**이라
 * 이어 붙이면 안 된다. 과거를 버리고 새 시계열로 다시 시작한다.
 */
export const mergeSeries = (
  prev: FieldHistorySeries | undefined,
  next: FieldHistorySeries
): FieldHistorySeries => {
  if (!prev || prev.target !== next.target) return next;

  const byPeriod = new Map<string, FieldHistoryPoint>();
  for (const p of prev.points) byPeriod.set(p.periodEnd, p);
  for (const p of next.points) byPeriod.set(p.periodEnd, p);

  return {
    scope: next.scope,
    target: next.target,
    points: [...byPeriod.values()].sort((a, b) =>
      a.periodEnd.localeCompare(b.periodEnd)
    ),
  };
};

export const mergeFieldHistory = (
  prev: FieldHistory | undefined,
  next: FieldHistory
): FieldHistory => {
  const merged: FieldHistory = { updatedAt: next.updatedAt };
  for (const ff of ['all', 'mobile', 'desktop'] as const) {
    const nextSeries = next[ff];
    // 이번 응답에 없는 폼팩터는 기존 값을 보존한다(일시적 404로 과거를 지우지 않는다).
    const series = nextSeries ? mergeSeries(prev?.[ff], nextSeries) : prev?.[ff];
    if (series) merged[ff] = series;
  }
  return merged;
};
