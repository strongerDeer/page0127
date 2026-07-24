import { DESKTOP_REGRESSION, REGRESSION } from './config.ts';
import type {
  FormFactor,
  PageMetrics,
  QualityRecord,
  RegressionRecord,
} from './types.ts';

export type TrendLabel = 'improving' | 'degrading' | 'flat';

// 저장 스키마(RegressionRecord)와 동일. formFactor 없으면 'mobile'(번들 등 폼팩터 무관 지표).
export type Regression = RegressionRecord;

export type Analysis = {
  isBaseline: boolean;
  current: QualityRecord;
  // 직전 레코드와 gitRef가 같은 경우(=같은 배포본 재측정). 코드가 동일하므로
  // 어떤 지표 변동도 코드 회귀일 수 없다 → regressions를 비우고 관찰용으로만 남긴다.
  sameDeployment: boolean;
  trend: { performance: TrendLabel; bundle: TrendLabel; weight: TrendLabel };
  regressions: Regression[];
  // sameDeployment일 때, 회귀로 잡혔을 변동을 관찰용으로 보존(노이즈, 코드 회귀 아님).
  suppressedRegressions: Regression[];
};

// 폼팩터별 회귀 임계. 데스크탑은 CPU 스로틀이 없어 표본이 훨씬 안정적이므로
// LCP/TBT 최소 회귀폭을 좁게 잡는다(모바일 임계를 쓰면 실제 악화를 놓친다).
const thresholdsFor = (formFactor: FormFactor) =>
  formFactor === 'desktop'
    ? { ...REGRESSION, ...DESKTOP_REGRESSION }
    : REGRESSION;

const avgPerformance = (r: QualityRecord): number => {
  if (r.pages.length === 0) return 0;
  return (
    r.pages.reduce((s, p) => s + p.lighthouse.performance, 0) / r.pages.length
  );
};

// 페이지 평균 총 전송 바이트(KB). 노이즈가 적어 추세 판단의 1순위.
const avgTotalKb = (r: QualityRecord): number => {
  const vals = r.pages
    .map((p) => p.weight?.totalKb ?? 0)
    .filter((v) => v > 0);
  if (vals.length === 0) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
};

const labelTrend = (
  prev: number,
  curr: number,
  betterWhenHigher: boolean
): TrendLabel => {
  const delta = curr - prev;
  if (Math.abs(delta) < 0.5) return 'flat';
  const improved = betterWhenHigher ? delta > 0 : delta < 0;
  return improved ? 'improving' : 'degrading';
};

// 같은 폼팩터끼리만 비교한다. 모바일 LCP와 데스크탑 LCP를 맞대면
// 스로틀 차이만으로 매번 거대한 '개선'이 잡혀 무의미하다.
const detectPageRegressions = (
  prevPages: PageMetrics[],
  currPages: PageMetrics[],
  formFactor: FormFactor
): Regression[] => {
  const t = thresholdsFor(formFactor);
  const tag = formFactor === 'desktop' ? '[desktop] ' : '';
  const regressions: Regression[] = [];

  for (const page of currPages) {
    const prevPage = prevPages.find((p) => p.name === page.name);
    if (
      prevPage &&
      prevPage.lighthouse.performance - page.lighthouse.performance >=
        t.performanceDrop
    ) {
      regressions.push({
        metric: 'performance',
        page: page.name,
        formFactor,
        prev: prevPage.lighthouse.performance,
        curr: page.lighthouse.performance,
        detail: `${tag}${page.name} Performance ${prevPage.lighthouse.performance}→${page.lighthouse.performance}`,
      });
    }
    // LCP 회귀는 "절대값 > 2500"이 아니라 "직전 대비 노이즈 밴드를 넘는 악화"일 때만.
    // 느린4G LCP는 표본마다 수십 초 출렁이므로(lcpSpreadMs), 그 흔들림보다
    // 크게 나빠졌을 때만 진짜 회귀로 본다. 이게 허위경보(매주 LCP 4건)의 해소책.
    if (prevPage) {
      const noiseBand = Math.max(page.lcpSpreadMs ?? 0, t.lcpMinRegressionMs);
      const lcpDelta = page.cwv.lcp - prevPage.cwv.lcp;
      if (lcpDelta > noiseBand) {
        regressions.push({
          metric: 'lcp',
          page: page.name,
          formFactor,
          prev: prevPage.cwv.lcp,
          curr: page.cwv.lcp,
          detail: `${tag}${page.name} LCP ${prevPage.cwv.lcp}→${page.cwv.lcp}ms (+${lcpDelta}ms, 노이즈 밴드 ±${Math.round(noiseBand)}ms 초과)`,
        });
      }
    }

    // 총 전송 바이트 회귀(안정 지표) — 이미지/스크립트 증가를 노이즈 없이 포착.
    if (prevPage?.weight?.totalKb && page.weight?.totalKb) {
      const ratio =
        (page.weight.totalKb - prevPage.weight.totalKb) /
        prevPage.weight.totalKb;
      if (ratio >= t.weightIncreaseRatio) {
        const imgDelta =
          (page.weight.imageKb ?? 0) - (prevPage.weight.imageKb ?? 0);
        regressions.push({
          metric: 'weight',
          page: page.name,
          formFactor,
          prev: prevPage.weight.totalKb,
          curr: page.weight.totalKb,
          detail: `${tag}${page.name} 전송 바이트 ${prevPage.weight.totalKb}→${page.weight.totalKb}KB (+${Math.round(ratio * 100)}%, 이미지 ${imgDelta >= 0 ? '+' : ''}${imgDelta}KB)`,
        });
      }
    }
    if (page.cwv.cls > t.clsMax) {
      regressions.push({
        metric: 'cls',
        page: page.name,
        formFactor,
        prev: prevPage?.cwv.cls ?? 0,
        curr: page.cwv.cls,
        detail: `${tag}${page.name} CLS ${page.cwv.cls} > ${t.clsMax}`,
      });
    }
    // TBT 회귀도 LCP와 동일하게 노이즈 밴드 기반. tbt 는 느린4G CPU 스로틀에서
    // 표본마다 출렁이므로(tbtSpreadMs) 절대 임계 단순비교는 허위경보를 낳는다.
    // (예: 121→213 은 같은 노이즈 분포의 표본이 우연히 200 을 넘은 것일 뿐.)
    // 절대값이 임계를 넘고 + 직전 대비 흔들림 폭을 넘는 악화일 때만 진짜 회귀.
    if (prevPage) {
      const tbtNoiseBand = Math.max(
        page.tbtSpreadMs ?? 0,
        t.tbtMinRegressionMs
      );
      const tbtDelta = page.cwv.tbt - prevPage.cwv.tbt;
      if (page.cwv.tbt > t.tbtMaxMs && tbtDelta > tbtNoiseBand) {
        regressions.push({
          metric: 'tbt',
          page: page.name,
          formFactor,
          prev: prevPage.cwv.tbt,
          curr: page.cwv.tbt,
          detail: `${tag}${page.name} TBT ${prevPage.cwv.tbt}→${page.cwv.tbt}ms (+${tbtDelta}ms, 임계 ${t.tbtMaxMs}ms·노이즈 밴드 ±${Math.round(tbtNoiseBand)}ms 초과)`,
        });
      }
    }
  }
  return regressions;
};

export const analyze = (history: QualityRecord[]): Analysis => {
  if (history.length === 0) {
    throw new Error('analyze: 빈 history는 분석할 수 없습니다');
  }
  const current = history[history.length - 1];
  if (history.length < 2) {
    return {
      isBaseline: true,
      current,
      sameDeployment: false,
      trend: { performance: 'flat', bundle: 'flat', weight: 'flat' },
      regressions: [],
      suppressedRegressions: [],
    };
  }

  const prev = history[history.length - 2];
  const regressions: Regression[] = [
    ...detectPageRegressions(prev.pages, current.pages, 'mobile'),
  ];

  // 데스크탑은 2026-07-09부터 수집 → 직전 레코드에 없으면 비교 대상이 없다.
  // 첫 데스크탑 측정을 회귀로 오인하지 않도록 조용히 건너뛴다(baseline 역할).
  if (prev.desktopPages?.length && current.desktopPages?.length) {
    regressions.push(
      ...detectPageRegressions(
        prev.desktopPages,
        current.desktopPages,
        'desktop'
      )
    );
  }

  if (prev.bundle.totalFirstLoadKb > 0) {
    const ratio =
      (current.bundle.totalFirstLoadKb - prev.bundle.totalFirstLoadKb) /
      prev.bundle.totalFirstLoadKb;
    if (ratio >= REGRESSION.bundleIncreaseRatio) {
      regressions.push({
        metric: 'bundle',
        prev: prev.bundle.totalFirstLoadKb,
        curr: current.bundle.totalFirstLoadKb,
        detail: `번들 ${prev.bundle.totalFirstLoadKb}KB→${current.bundle.totalFirstLoadKb}KB (+${Math.round(ratio * 100)}%)`,
      });
    }
  }

  // gitRef가 직전과 동일하면 같은 배포본을 재측정한 것 → 코드 변화가 없으므로
  // 모든 지표 변동은 랩 노이즈(perf/lcp/tbt)나 라이브 콘텐츠 변동(weight/cls)일 뿐
  // 코드 회귀가 아니다. 회귀로 단정하지 않고 관찰용(suppressedRegressions)으로만 남긴다.
  // ('unknown'은 git ref 해석 실패 sentinel이라 동일 판정에서 제외 → 회귀 감지 유지.)
  const sameDeployment =
    current.gitRef === prev.gitRef && current.gitRef !== 'unknown';

  return {
    isBaseline: false,
    current,
    sameDeployment,
    trend: {
      performance: labelTrend(
        avgPerformance(prev),
        avgPerformance(current),
        true
      ),
      bundle: labelTrend(
        prev.bundle.totalFirstLoadKb,
        current.bundle.totalFirstLoadKb,
        false
      ),
      weight: labelTrend(avgTotalKb(prev), avgTotalKb(current), false),
    },
    regressions: sameDeployment ? [] : regressions,
    suppressedRegressions: sameDeployment ? regressions : [],
  };
};
