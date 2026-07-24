// 측정 폼팩터. Lighthouse 기본값은 mobile(느린4G·CPU 4x 스로틀)이라
// 2026-07-09 이전 레코드는 전부 mobile 측정이며 formFactor 필드가 없다.
// 필드가 없으면 'mobile'로 해석한다(하위호환).
export type FormFactor = 'mobile' | 'desktop';

export type LighthouseScores = {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
};

export type CoreWebVitals = {
  lcp: number; // ms
  cls: number; // unitless
  tbt: number; // ms
  fcp: number; // ms
  si: number; // ms (speed index)
};

// 전송 바이트(transferSize) 기반 안정 지표 — LCP/SI 같은 타이밍과 달리
// 표본 간 거의 흔들리지 않아 이미지·번들 최적화 효과를 정직하게 드러낸다.
export type WeightMetrics = {
  totalKb: number; // 페이지 총 전송 바이트(KB)
  imageKb: number; // 이미지 전송 바이트(KB)
  scriptKb: number; // 스크립트 전송 바이트(KB)
};

export type PageMetrics = {
  name: string;
  url: string;
  formFactor?: FormFactor; // 없으면 'mobile'(구 레코드 하위호환)
  lighthouse: LighthouseScores; // 표본 중앙값
  cwv: CoreWebVitals; // 표본 중앙값
  weight?: WeightMetrics; // 전송 바이트(노이즈 적은 안정 지표)
  samples?: number; // Lighthouse 측정 횟수(중앙값 표본 수)
  lcpSpreadMs?: number; // 표본 LCP 최대-최소 — 랩 노이즈 가시화
  tbtSpreadMs?: number; // 표본 TBT 최대-최소 — 랩 노이즈 가시화
};

// ── 필드 데이터(CrUX) — 실제 크롬 사용자 28일 75분위 ────────────────────
// 랩(Lighthouse)과 달리 실사용자의 회선·기기·캐시가 반영된 값. **합격/불합격 판정은 이걸로 한다.**
// 랩 수치는 조건을 극단으로 고정해 개선 폭을 드러내는 용도(주차 간 상대 비교)일 뿐이다.
export type FieldCwv = {
  lcp?: number; // ms
  inp?: number; // ms (랩에는 없는 지표)
  cls?: number; // unitless
  fcp?: number; // ms
  ttfb?: number; // ms
  // LCP를 4단계로 분해. 합이 대략 lcp — 어디가 진짜 병목인지 가른다.
  // (실측: 모바일 LCP 1444ms 중 ttfbMs 928ms(64%), loadDurationMs 129ms(9%)
  //  → 실사용자에겐 이미지 무게가 아니라 서버 응답이 병목)
  lcpBreakdown?: {
    ttfbMs: number;
    loadDelayMs: number;
    loadDurationMs: number;
    renderDelayMs: number;
  };
};

export type FieldMetrics = {
  // 'origin' = URL 단위 트래픽이 CrUX 임계 미만이라 사이트 전체 집계를 쓴 것.
  // shop 홈은 현재 origin 집계다 → 페이지별 필드 지표는 존재하지 않는다.
  scope: 'url' | 'origin';
  target: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  mobile?: FieldCwv;
  desktop?: FieldCwv;
};

// ── 필드 추세(CrUX History API) ──────────────────────────────────────────
// `records:queryHistoryRecord`는 최근 **25개 주간 포인트**를 한 번에 준다(각 포인트는
// 28일 롤링 윈도, 매주 한 칸씩 이동). 즉 추세를 만들려고 매주 스냅샷을 쌓을 필요가 없다
// — 한 번 부르면 과거가 통째로 백필된다.
//
// 다만 25주를 넘긴 과거는 응답에서 사라지므로(롤링), 저장 시 기존 파일과 **병합**해
// 누적한다. 그래서 주간 레코드(append)와 라이프사이클이 달라 별도 파일에 둔다.

/** 한 지표의 한 주 값. p75와 등급 분포(합 ≈ 1)를 함께 담는다. */
export type FieldMetricPoint = {
  p75?: number;
  // CWV 표준 임계로 나뉜 3구간의 사용자 비율(0~1).
  // LCP [0,2.5s)[2.5s,4s)[4s,∞) · INP [0,200ms)... · CLS [0,0.1)...
  // "p75가 1305ms"보다 "사용자의 95.3%가 good"이 합격 기준(good ≥ 75%)과 직접 대응한다.
  good?: number;
  needsImprovement?: number;
  poor?: number;
};

/** 주 단위 한 포인트. periodEnd가 병합 키다. */
export type FieldHistoryPoint = {
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD — 병합 키
  lcp?: FieldMetricPoint;
  inp?: FieldMetricPoint;
  cls?: FieldMetricPoint;
  fcp?: FieldMetricPoint;
  ttfb?: FieldMetricPoint;
};

export type FieldHistorySeries = {
  scope: 'url' | 'origin';
  target: string;
  points: FieldHistoryPoint[]; // periodEnd 오름차순
};

/**
 * 폼팩터별 시계열.
 * `all`(폼팩터 미지정)은 표본이 안 쪼개져 **히스토리가 가장 길다**(폼팩터별은
 * CrUX 표본 임계 미달로 짧다). 긴 추세는 all로 보고, 폼팩터 토글은 mobile/desktop으로 본다.
 */
export type FieldHistory = {
  updatedAt: string; // ISO
  all?: FieldHistorySeries;
  mobile?: FieldHistorySeries;
  desktop?: FieldHistorySeries;
};

export type FieldHistoryFile = {
  schemaVersion: 1;
  /** 앱 이름 → 시계열. 현재는 'shop' 하나. */
  apps: Record<string, FieldHistory>;
};

export type SeoMetrics = {
  hreflangValid: boolean;
  canonicalValid: boolean;
  sitemapOk: boolean;
  robotsOk: boolean;
  jsonLdPresent: boolean;
  brokenLinks: number;
};

export type RuntimeMetrics = {
  consoleErrors: number;
  consoleWarnings: number;
  failedRequests: number;
  hydrationWarnings: number;
};

export type CodeHealthMetrics = {
  tscErrors: number;
  eslintErrors: number;
  eslintWarnings: number;
  todoFixme: number;
};

export type BundleMetrics = {
  totalFirstLoadKb: number;
  routes: { route: string; firstLoadKb: number }[];
};

export type QualityRecord = {
  timestamp: string; // ISO
  app: string;
  env: 'production' | 'local';
  targetUrl: string;
  gitRef: string;
  // 모바일(느린4G) 측정. 폼팩터를 섞지 않고 별도 배열로 두는 이유: 기존 10주치
  // 히스토리·대시보드·회귀 판정이 전부 "pages = 모바일"을 전제로 name 매칭한다.
  // 한 배열에 섞으면 name이 중복돼 avgPerf가 두 폼팩터 평균으로 오염된다.
  pages: PageMetrics[];
  // 데스크탑(빠른 4G·CPU 스로틀 없음) 측정. 2026-07-09부터 수집 — 그 이전 레코드엔 없다.
  // 모바일과 절대 비교하지 말 것(스로틀이 달라 Perf가 구조적으로 15~20점 높다).
  desktopPages?: PageMetrics[];
  bundle: BundleMetrics;
  buildTimeSec: number;
  // 실사용자(CrUX) 지표. 2026-07-09부터 수집 — CRUX_API_KEY가 없거나 트래픽이
  // CrUX 임계 미만이면 undefined다(측정 실패가 아니라 "데이터 없음").
  field?: FieldMetrics;
  seo: SeoMetrics;
  runtime: RuntimeMetrics;
  codeHealth: CodeHealthMetrics;
  analysisComment?: string;
  // analyze() 판정 결과의 사본. 리포트·완료 로그에만 있던 것을 레코드에도 남겨
  // 사후에 JSON만으로 "그 주에 무엇이 회귀였나"를 답할 수 있게 한다.
  // 2026-07-09부터 기록 — 그 이전 레코드엔 없다(undefined ≠ "회귀 0건").
  regressions?: RegressionRecord[];
  suppressedRegressions?: RegressionRecord[]; // 동일 배포본 재측정 시 관찰용(코드 회귀 아님)
};

// analyze.ts 의 Regression 과 같은 모양. 저장 스키마가 분석 모듈에 의존하지 않도록
// types.ts 에 독립 정의한다(analyze 가 이 타입에 맞춘다).
export type RegressionRecord = {
  metric: 'performance' | 'bundle' | 'lcp' | 'cls' | 'tbt' | 'weight';
  page?: string;
  formFactor?: FormFactor;
  prev: number;
  curr: number;
  detail: string;
};

export type QualityHistory = {
  schemaVersion: 1;
  history: QualityRecord[];
};
