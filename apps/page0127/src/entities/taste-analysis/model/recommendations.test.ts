import { describe, expect, it } from 'vitest';

import {
  groupRecommendationsByType,
  RECOMMENDATIONS_DISPLAY_LIMIT,
  RECOMMENDATIONS_REQUEST_COUNT,
} from './recommendations';

import type { BookRecommendation } from '../types';

/** 테스트용 추천 행 — 검증에 쓰는 필드만 지정하고 나머지는 기본값 */
const makeRecommendation = (
  overrides: Partial<BookRecommendation> & {
    recommendation_type: BookRecommendation['recommendation_type'];
    display_order: number;
  }
): BookRecommendation => ({
  id: `${overrides.recommendation_type}-${overrides.display_order}`,
  taste_analysis_id: 'analysis-1',
  isbn: '9788901234567',
  title: '테스트 도서',
  author: '테스트 저자',
  publisher: null,
  cover_image: 'https://image.aladin.co.kr/cover.jpg',
  category: null,
  reason: '추천 이유',
  created_at: '2026-07-29T00:00:00.000Z',
  ...overrides,
});

describe('groupRecommendationsByType', () => {
  it('타입별로 나누고 노출 상한까지만 자른다', () => {
    const rows = (['match', 'expand', 'challenge'] as const).flatMap((type) =>
      [1, 2, 3, 4].map((order) =>
        makeRecommendation({ recommendation_type: type, display_order: order })
      )
    );

    const grouped = groupRecommendationsByType(rows);

    expect(grouped.match).toHaveLength(RECOMMENDATIONS_DISPLAY_LIMIT);
    expect(grouped.expand).toHaveLength(RECOMMENDATIONS_DISPLAY_LIMIT);
    expect(grouped.challenge).toHaveLength(RECOMMENDATIONS_DISPLAY_LIMIT);
  });

  it('display_order가 뒤섞여 들어와도 순서대로 앞에서 자른다', () => {
    const rows = [4, 2, 1, 3].map((order) =>
      makeRecommendation({ recommendation_type: 'match', display_order: order })
    );

    expect(
      groupRecommendationsByType(rows).match.map((r) => r.display_order)
    ).toEqual([1, 2, 3]);
  });

  it('표지가 아직 없는 추천도 노출한다', () => {
    // 이 assertion 이 잠그는 버그: 표지는 분석 응답을 보낸 뒤 백그라운드에서
    // 채워진다. 표지 없는 행을 걸러내면 분석 직후 들어온 사용자에게는
    // "추천 도서가 없습니다" 만 보인다 — 실제로 발생했던 증상이다.
    const rows = [
      makeRecommendation({
        recommendation_type: 'expand',
        display_order: 1,
        cover_image: null,
      }),
    ];

    expect(groupRecommendationsByType(rows).expand).toHaveLength(1);
  });

  it('추천이 없으면 세 타입 모두 빈 배열이다', () => {
    const grouped = groupRecommendationsByType(null);

    expect(grouped).toEqual({ match: [], expand: [], challenge: [] });
  });
});

describe('추천 권수 상수', () => {
  it('AI 요청 권수는 노출 상한보다 크다', () => {
    // 알라딘에 없는 책은 삭제되므로 여유분 없이 받으면 상한을 못 채운다
    expect(RECOMMENDATIONS_REQUEST_COUNT).toBeGreaterThan(
      RECOMMENDATIONS_DISPLAY_LIMIT
    );
  });
});
