import type { CSSProperties } from 'react';

/**
 * Recharts 공통 색·스타일
 *
 * 색은 globals.css 의 차트 토큰(--chart-1~7)과 1:1로 맞춘 "리터럴 값"이다.
 * Recharts 는 fill/stroke 를 SVG *속성*(<path fill="…">)으로 렌더하는데,
 * SVG presentation attribute 는 CSS var() 를 해석하지 못한다(→ 검정 폴백).
 * 그래서 여기서는 토큰을 참조하지 않고 같은 hex 를 직접 박는다.
 * globals.css 의 차트 토큰이 바뀌면 이 파일도 함께 갱신한다.
 *
 * 방향: 그린을 메인으로, 카테고리처럼 "서로 다른 정체성"에는 생기 있는
 * 보조 색을 돌려 쓴다(토스풍). 시계열·단일 계열 막대는 그린 그라데이션.
 */
export const chartInk = {
  /** 그린 — 주 계열·강조 막대·브랜드 */
  primary: '#22c55e',
  /** 그린 그라데이션 (막대 위→아래) */
  primaryGradientTop: '#22c55e',
  primaryGradientBottom: '#86efac',
  /** 옅은 그린 — 비강조 막대(값이 작은 항목) */
  muted: '#c9f5d7',
  /** 오커/골드 — 별점 아이콘 */
  gold: '#eab308',
  /** 그리드 선 (= --line) */
  grid: '#e5e2dc',
  /** 축 눈금 글자 (= --text-faint) */
  axis: '#9a9a9a',
  /** 호버 커서 배경 — 그린 8% */
  cursor: 'rgba(34, 197, 94, 0.08)',
} as const;

/**
 * 카테고리(서로 다른 정체성)용 멀티컬러 팔레트 — globals.css --chart-1~7 미러.
 * 고정 순서로 돌려 쓴다(색은 항목을 따라가고, 순위를 따라가지 않는다).
 */
export const chartCategorical = [
  '#22c55e', // 그린
  '#3b82f6', // 블루
  '#f59e0b', // 앰버
  '#a855f7', // 퍼플
  '#f43f5e', // 로즈
  '#14b8a6', // 틸
  '#eab308', // 옐로
] as const;

/** index 로 카테고리 색을 고정 순서로 집는다(7개 초과 시 순환) */
export const categoricalColor = (index: number): string =>
  chartCategorical[index % chartCategorical.length];

/**
 * Recharts Tooltip 공통 스타일 — 디자인 토큰(--card / --border / --radius) 기반.
 * contentStyle 은 차트 위에 뜨는 일반 HTML div 라 CSS 변수가 그대로 적용된다.
 */
export const chartTooltipStyle: CSSProperties = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '8px 12px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  fontSize: '13px',
};
