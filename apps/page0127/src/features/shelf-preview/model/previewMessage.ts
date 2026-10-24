import { TASTE_ANALYSIS_MIN_BOOKS } from '@/entities/taste-analysis/model/analysisGate';

import { FIRST_IMPRESSION_MIN_BOOKS } from './firstImpression';

/**
 * 책장 아래 한 줄 — 판단("~쪽으로 기울어 있다")이 아니라 다음 단계를 말한다.
 * 다음 단계는 두 칸이다: 세 권이면 첫인상(홈 부제의 약속), 다섯 권이면 취향 노트.
 * 고르기만 한 책에는 별점이 없으므로 5권을 넘겨도 "바로 받는다"고 하지 않는다.
 */
export const toShelfPreviewMessage = (count: number): string | null => {
  if (count <= 0) return null;
  if (count < FIRST_IMPRESSION_MIN_BOOKS) {
    return `${FIRST_IMPRESSION_MIN_BOOKS - count}권만 더 고르면 첫인상을 알려드릴게요.`;
  }
  if (count < TASTE_ANALYSIS_MIN_BOOKS) {
    return `${TASTE_ANALYSIS_MIN_BOOKS - count}권만 더 모이면 취향 노트를 받아 볼 수 있어요.`;
  }
  return '별점만 매기면 바로 취향 노트를 받아 볼 수 있어요.';
};
