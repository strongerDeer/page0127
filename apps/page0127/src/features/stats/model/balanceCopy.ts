import { BALANCE_CATEGORIES, type ReadingBalance } from '@/entities/book';

/** 문구는 진행형 — "기울었다" 같은 판단은 쓰지 않는다(2026-10-08 반려 기록) */
export const getBalanceLabel = (score: number | null): string => {
  if (score === null) return '책이 더 쌓이면 보여요';
  if (score < 40) return '한 우물을 깊이 파는 중';
  if (score < 70) return '조금씩 넓혀 가는 중';
  return '고르게 읽는 중';
};

/**
 * 받침 유무로 '이/가'를 고른다.
 * 학습 포인트: 한글 음절은 U+AC00 부터 (초성 19 × 중성 21 × 종성 28) 순서라
 * (코드 − 0xAC00) % 28 이 0 이면 받침이 없다.
 */
const subjectParticle = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return hasBatchim ? '이' : '가';
};

export const getBalanceSummary = (balance: ReadingBalance): string => {
  if (balance.total === 0) {
    // 완독은 있는데 전부 분류 불명이면 "0권"처럼 말하면 사실과 다르다
    return balance.unclassified > 0
      ? `분야 정보가 없는 책 ${balance.unclassified}권은 아직 셀 수 없어요`
      : '완독한 책이 쌓이면 분야가 채워져요';
  }
  const top = balance.ranked
    .slice(0, 2)
    .map(({ category }) => category)
    .join('·');
  return `${BALANCE_CATEGORIES.length}개 분야 중 ${balance.readCount}개를 읽었어요. ${top}${subjectParticle(top)} ${balance.topShare}%`;
};

export const getBalanceDelta = (balance: ReadingBalance): string | null => {
  if (!balance.prev) return null;
  const { readCountDelta, newCategories } = balance.prev;
  if (readCountDelta > 0) {
    const added =
      newCategories.length > 0 ? ` (+${newCategories.join(', ')})` : '';
    return `작년보다 ${readCountDelta}개 분야 넓어졌어요${added}`;
  }
  if (readCountDelta === 0) {
    return `작년과 같은 ${balance.readCount}개 분야를 읽고 있어요`;
  }
  return `작년엔 ${balance.readCount - readCountDelta}개 분야를 읽었어요`;
};

/**
 * 차트 계열 토큰 7개. 이름을 템플릿(`--chart-${n}`)으로 만들면
 * app/token-usage.test.ts 가 정의 여부를 대조할 수 없다 → 글자 그대로 나열한다.
 * 달력 기간 막대도 같은 순서를 쓴다.
 */
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
] as const;

/** 순위 → 분야 색. 토큰이 7개라 8·9위는 슬레이트(chart-5)를 함께 쓴다 */
export const categoryColor = (rank: number): string =>
  rank < CHART_COLORS.length ? CHART_COLORS[rank] : 'var(--chart-5)';
