import type { FormFactor } from './types.ts';

export type PageAnchor = { name: string; path: string };

// 측정 대상 배포 URL. CI에서 QUALITY_TARGET_URL로 주입.
// 로컬 검증 시엔 로컬 개발 서버(예: http://localhost:3000)를 넣는다.
const TARGET_URL = process.env.QUALITY_TARGET_URL ?? 'http://localhost:3000';

// 측정 앵커는 "인기 페이지"가 아니라 **회귀 감지용 고정 URL**이다.
// 같은 URL을 계속 재야 코드 변경 영향을 주차 간 비교로 잡는다.
// 실사용자 대표성은 CrUX(record.field, origin 집계)가 담당한다.
export const APP = {
  name: 'page0127',
  env: 'production' as const,
  targetUrl: TARGET_URL,
  pages: [
    { name: 'home', path: '/' },
    { name: 'about', path: '/about' },
    { name: 'library', path: '/books/all' },
    // profile: 동적 사용자 페이지. dreamfulbud는 소유자 계정이라 삭제 위험이 없다.
    { name: 'profile', path: '/dreamfulbud' },
    // detail: 무거운 동적 상세. 고정 bookId로 시계열을 유지한다(삭제되면 config에서 교체).
    {
      name: 'detail',
      path: '/dreamfulbud/80a21270-ed22-4e3a-a1e9-17f65b361c54',
    },
  ] satisfies PageAnchor[],
};

// Lighthouse 반복 횟수(중앙값). 느린4G LCP/SI 노이즈를 걷어낸다. LH_RUNS로 조정.
export const LIGHTHOUSE_RUNS = Math.max(1, Number(process.env.LH_RUNS ?? 3));

// 측정 폼팩터. 기본 둘 다 → 측정 시간 약 2배. LH_FORM_FACTORS로 조정.
const parseFormFactors = (raw: string | undefined): FormFactor[] => {
  if (!raw) return ['mobile', 'desktop'];
  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is FormFactor => s === 'mobile' || s === 'desktop');
  if (parsed.length === 0) {
    throw new Error(`LH_FORM_FACTORS 값이 잘못됨: '${raw}' (허용: mobile, desktop)`);
  }
  return [...new Set(parsed)];
};
export const FORM_FACTORS = parseFormFactors(process.env.LH_FORM_FACTORS);

// 회귀 임계 — shop-chart 실측 튜닝값을 초기값으로 그대로 사용, page0127 노이즈 보며 조정.
export const REGRESSION = {
  performanceDrop: 8,
  bundleIncreaseRatio: 0.1,
  lcpMaxMs: 2500,
  clsMax: 0.1,
  tbtMaxMs: 200,
  lcpMinRegressionMs: 1500,
  tbtMinRegressionMs: 100,
  weightIncreaseRatio: 0.15,
};

// 데스크탑은 CPU 스로틀이 없고 회선이 빨라 표본 흔들림이 모바일보다 훨씬 작다.
// 따라서 노이즈 밴드 하한(LCP/TBT 최소 회귀폭)을 모바일보다 좁게 잡아야
// 실제 악화를 놓치지 않는다. analyze.ts가 데스크탑 폼팩터일 때 REGRESSION에 병합해 쓴다.
export const DESKTOP_REGRESSION = {
  lcpMinRegressionMs: 500,
  tbtMinRegressionMs: 50,
  tbtMaxMs: 150,
};

// 로컬 JSON 검증 단계(Task 7/8)에서만 쓰는 경로. Supabase 전환(Task 10) 후엔 미사용.
export const DATA_PATH = 'packages/quality/.data/quality-metrics.json';
export const FIELD_HISTORY_PATH = 'packages/quality/.data/quality-field-history.json';
