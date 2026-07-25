import { type Verdict, verdict } from './verdict';

import type { PageMetrics, QualityRecord } from '@repo/quality/types';

// 그리드·추세가 함께 쓰는 지표 4종. 시안에서 확정한 열: 성능 / LCP(랩) / 전송 / CLS.
// (LCP 랩과 전송량은 판정 색을 안 매긴다 — 회선/콘텐츠 영향이라 코드 신호로 보기 어렵다.)
export type MetricKey = 'perf' | 'lcp' | 'weight' | 'cls';
export type FormFactor = 'mobile' | 'desktop';

export type MetricDef = {
  key: MetricKey;
  label: string;
  lowerIsBetter: boolean;
  // PageMetrics에서 값을 꺼낸다. 구 레코드는 weight가 없을 수 있어 number | undefined.
  read: (p: PageMetrics) => number | undefined;
  format: (v: number) => string;
  formatDelta: (d: number) => string;
  // 판정이 없는 지표(LCP 랩·전송)는 null → 회색 처리.
  verdict: ((v: number) => Verdict) | null;
};

const fmtMs = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`;

// 성능 점수(0~100) 판정 — Lighthouse 표준 구간. verdict.ts는 CWV/랩 지표만 다뤄
// 점수 밴드는 여기서 정의한다.
const perfVerdict = (v: number): Verdict =>
  v >= 90 ? 'pass' : v >= 50 ? 'warn' : 'fail';

export const METRICS: Record<MetricKey, MetricDef> = {
  perf: {
    key: 'perf',
    label: '성능',
    lowerIsBetter: false,
    read: (p) => p.lighthouse.performance,
    format: (v) => String(Math.round(v)),
    formatDelta: (d) => String(Math.round(Math.abs(d))),
    verdict: perfVerdict,
  },
  lcp: {
    key: 'lcp',
    label: 'LCP(랩)',
    lowerIsBetter: true,
    read: (p) => p.cwv.lcp,
    format: fmtMs,
    formatDelta: (d) => fmtMs(Math.abs(d)),
    verdict: null,
  },
  weight: {
    key: 'weight',
    label: '전송',
    lowerIsBetter: true,
    read: (p) => p.weight?.totalKb,
    format: (v) => `${Math.round(v)}KB`,
    formatDelta: (d) => `${Math.round(Math.abs(d))}KB`,
    verdict: null,
  },
  cls: {
    key: 'cls',
    label: 'CLS',
    lowerIsBetter: true,
    read: (p) => p.cwv.cls,
    format: (v) => v.toFixed(2),
    formatDelta: (d) => Math.abs(d).toFixed(2),
    verdict: (v) => verdict('cls', v, 'mobile'),
  },
};

export const METRIC_ORDER: MetricKey[] = ['perf', 'lcp', 'weight', 'cls'];

// 페이지 선 색 — dataviz 카테고리 순서(파랑·주황·아쿠아·노랑·마젠타…). 페이지 순번대로 배정.
export const PAGE_PALETTE = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#4a3aa7',
  '#008300',
];

export const pagesOf = (r: QualityRecord, ff: FormFactor): PageMetrics[] =>
  ff === 'mobile' ? r.pages : (r.desktopPages ?? []);

// ISO 타임스탬프 → 'MM/DD' (x축 라벨용).
export const weekLabel = (iso: string): string => {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}/${day}`;
};

export type MetricSeries = { page: string; values: (number | null)[] };

// 레코드들(오래된→최신)을 페이지별 값 배열로. 각 배열은 records와 같은 길이로 정렬되고,
// 그 레코드에 해당 페이지/값이 없으면 null(선이 끊긴다). 페이지 순서는 "가장 최신 레코드" 기준.
export const buildSeries = (
  records: QualityRecord[],
  ff: FormFactor,
  def: MetricDef,
): MetricSeries[] => {
  if (records.length === 0) return [];

  // 페이지 순서: 최신 레코드부터 훑어 처음 등장하는 순서를 표준으로. (최신 레코드가 비면 그 다음.)
  const order: string[] = [];
  for (let i = records.length - 1; i >= 0; i--) {
    for (const p of pagesOf(records[i], ff)) {
      if (!order.includes(p.name)) order.push(p.name);
    }
  }

  return order.map((name) => ({
    page: name,
    values: records.map((r) => {
      const page = pagesOf(r, ff).find((p) => p.name === name);
      const v = page ? def.read(page) : undefined;
      return v == null ? null : v;
    }),
  }));
};

export type Dir = 'up' | 'down' | 'flat'; // up=개선, down=악화, flat=변화 없음

// 마지막 두 유효값으로 최신값·증감·방향. lowerIsBetter면 감소가 개선.
export const seriesDelta = (
  values: (number | null)[],
  lowerIsBetter: boolean,
): { last: number | null; delta: number | null; dir: Dir } => {
  const nn = values.filter((v): v is number => v != null);
  if (nn.length === 0) return { last: null, delta: null, dir: 'flat' };
  const last = nn[nn.length - 1];
  if (nn.length === 1) return { last, delta: null, dir: 'flat' };
  const prev = nn[nn.length - 2];
  const d = last - prev;
  const rel = prev !== 0 ? Math.abs(d) / Math.abs(prev) : Math.abs(d);
  if (rel < 0.008) return { last, delta: d, dir: 'flat' };
  const improved = lowerIsBetter ? d < 0 : d > 0;
  return { last, delta: d, dir: improved ? 'up' : 'down' };
};

// 서버에서 한 번 만들어 그리드(서버)·추세(클라)로 함께 넘기는 압축 페이로드.
export type TrendPayload = {
  weeks: string[]; // x축 라벨, records 순서(오래된→최신)
  pages: string[]; // 표준 페이지 순서(모바일 기준, 없으면 데스크탑)
  mobile: Record<MetricKey, MetricSeries[]>;
  desktop: Record<MetricKey, MetricSeries[]>;
};

export const buildTrendPayload = (records: QualityRecord[]): TrendPayload => {
  const byFf = (ff: FormFactor) =>
    Object.fromEntries(
      METRIC_ORDER.map((k) => [k, buildSeries(records, ff, METRICS[k])]),
    ) as Record<MetricKey, MetricSeries[]>;

  const mobile = byFf('mobile');
  const pages = (mobile.perf.length ? mobile.perf : buildSeries(records, 'desktop', METRICS.perf)).map(
    (s) => s.page,
  );

  return {
    weeks: records.map((r) => weekLabel(r.timestamp)),
    pages,
    mobile,
    desktop: byFf('desktop'),
  };
};
