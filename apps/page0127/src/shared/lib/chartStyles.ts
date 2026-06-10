import type { CSSProperties } from 'react';

/**
 * Recharts Tooltip 공통 스타일
 *
 * 차트마다 제각각이던 Tooltip 박스를 디자인 토큰(--card / --border / --radius)
 * 기반으로 통일한다. contentStyle은 차트 위에 뜨는 일반 HTML div라
 * CSS 변수가 그대로 적용된다.
 */
export const chartTooltipStyle: CSSProperties = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '8px 12px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
};
