/**
 * 추천 도서 노출 규칙
 *
 * 학습 포인트:
 * - "AI에게 몇 권 받을지"와 "화면에 몇 권 보여줄지"는 다른 숫자다
 * - 조회 지점이 3곳(대시보드·상세·API)이라 그룹화 로직을 한 곳에 모은다
 */

import type { BookRecommendation } from '../types';

/** 타입별로 화면에 노출하는 추천 권수 상한 */
export const RECOMMENDATIONS_DISPLAY_LIMIT = 3;

/**
 * AI에게 요청하는 타입별 추천 권수.
 *
 * 노출 상한보다 1권 많게 받는다 — AI가 실재하지 않는 책을 섞어 보내면
 * 알라딘 대조 단계에서 그 행이 삭제되기 때문에, 딱 맞춰 받으면
 * 섹션이 상한을 못 채운 채로 보인다.
 */
export const RECOMMENDATIONS_REQUEST_COUNT = RECOMMENDATIONS_DISPLAY_LIMIT + 1;

/**
 * 추천 도서를 타입별로 그룹화하고 노출 상한까지 자른다.
 *
 * 표지(cover_image) 유무로 거르지 않는다. 표지는 분석 응답을 보낸 뒤
 * 백그라운드에서 채워지므로, 여기서 걸러내면 분석 직후에 들어온 사용자에게는
 * 섹션이 통째로 비어 보인다.
 */
export function groupRecommendationsByType(
  recommendations: BookRecommendation[] | null
): {
  match: BookRecommendation[];
  expand: BookRecommendation[];
  challenge: BookRecommendation[];
} {
  const pick = (type: BookRecommendation['recommendation_type']) =>
    (recommendations ?? [])
      .filter((r) => r.recommendation_type === type)
      .sort((a, b) => a.display_order - b.display_order)
      .slice(0, RECOMMENDATIONS_DISPLAY_LIMIT);

  return {
    match: pick('match'),
    expand: pick('expand'),
    challenge: pick('challenge'),
  };
}
