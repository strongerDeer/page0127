export type Verdict = 'pass' | 'warn' | 'fail' | 'neutral';
export type VerdictMetric =
  | 'labLcp' // 느린4G 랩 LCP → 회선 속도라 판정 제외(neutral)
  | 'fieldLcpP75'
  | 'fieldInpP75'
  | 'fieldClsP75'
  | 'tbt'
  | 'cls';

// CWV 표준 임계: good / poor 경계. 그 사이는 warn.
const THRESHOLDS: Record<string, [number, number]> = {
  fieldLcpP75: [2500, 4000],
  fieldInpP75: [200, 500],
  fieldClsP75: [0.1, 0.25],
  tbt: [200, 600],
  cls: [0.1, 0.25],
};

export const verdict = (
  metric: VerdictMetric,
  value: number,
  _formFactor: 'mobile' | 'desktop'
): Verdict => {
  // 랩 LCP는 코드 신호가 없어 색으로 판정하지 않는다(shop-chart 도메인 지식).
  if (metric === 'labLcp') return 'neutral';
  const t = THRESHOLDS[metric];
  if (!t) return 'neutral';
  if (value <= t[0]) return 'pass';
  if (value <= t[1]) return 'warn';
  return 'fail';
};
