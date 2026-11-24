/**
 * 어드민 차트 색 — 브랜드(블루) + 서브(민트) + 퍼플로 산뜻하게 (HJ, 2026-11-24).
 *
 * 앱 화면 차트(chartStyles.ts 의 그린)와 따로 둔다. 어드민은 "운영 콘솔"이라
 * 브랜드 블루를 주 계열로 쓰고, 서로 다른 항목(채널·기기)은 아래 순서로 돌려 쓴다.
 *
 * Recharts·SVG fill 속성은 CSS var() 를 못 읽어서(검정 폴백) hex 를 그대로 둔다.
 * 다크 모드에서도 남색 배경 위 3:1(그래픽 기준)을 넘는 밝기만 골랐다.
 */
export const adminInk = {
  /** 브랜드 블루(--blue-500) — 주 계열 */
  primary: '#2d78db',
  /** 민트 — 강조 칸(가장 큰 값·오늘) */
  mint: '#34d399',
  /** 퍼플(--violet-500) */
  violet: '#7a5cf0',
  /** 스카이(--blue-300) */
  sky: '#74b0ff',
  /** 틸 — 다섯째 항목 */
  teal: '#14b8a6',
  /** 기타·나머지 — 눈에 덜 띄게 */
  rest: '#b8c0cf',
} as const;

/** 서로 다른 항목에 돌려 쓰는 순서 — 이웃한 조각끼리 색이 확 갈리게 블루·민트·퍼플·스카이·틸 */
export const adminCategorical = [
  adminInk.primary,
  adminInk.mint,
  adminInk.violet,
  adminInk.sky,
  adminInk.teal,
] as const;

export const adminCategoricalColor = (index: number): string =>
  adminCategorical[index % adminCategorical.length];
