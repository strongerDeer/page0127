import { TASTE_ANALYSIS_MIN_BOOKS } from '@/entities/taste-analysis/model/analysisGate';
import { FIRST_IMPRESSION_MIN_BOOKS } from '@/entities/taste-analysis/model/firstImpression';

/**
 * 책장 아래 한 줄 — 판단("~쪽으로 기울어 있다")이 아니라 다음 단계를 말한다.
 * 다음 단계는 두 칸이다: 세 권이면 첫인상(홈 부제의 약속), 다섯 권이면 취향 노트.
 * 다섯 권부터는 저장 버튼만 남긴다.
 */
export const toShelfPreviewMessage = (count: number): string | null => {
  if (count <= 0) return null;
  if (count < FIRST_IMPRESSION_MIN_BOOKS) {
    return `${FIRST_IMPRESSION_MIN_BOOKS - count}권만 더 고르면 첫인상을 알려드릴게요.`;
  }
  if (count < TASTE_ANALYSIS_MIN_BOOKS) {
    return `${TASTE_ANALYSIS_MIN_BOOKS - count}권만 더 모이면 취향 노트를 받아 볼 수 있어요.`;
  }
  // 다섯 권부터는 말하지 않는다 — "별점만 매기면…"은 첫인상 카드 아래에서 군더더기였다
  // (2026-10-25 HJ 홈 개편). 다음 할 일은 바로 아래 저장 버튼이 말한다.
  return null;
};
