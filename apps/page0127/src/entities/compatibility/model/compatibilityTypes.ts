/**
 * 독서 궁합 타입 카탈로그
 *
 * 학습 포인트:
 * - 타입명을 AI 자유 생성에 맡기지 않고 점수 구간으로 서버에서 결정
 *   → 같은 점수는 항상 같은 타입 (일관성 = 브랜드 언어, 공유 시 비교 가능)
 * - 낮은 점수도 부정적이지 않게 — "안 맞는 사이"가 아니라 "서로를 넓혀줄 사이"
 */

export type CompatibilityTypeBand = {
  /** 구간 최소 점수 (이상) */
  min: number;
  /** 타입 이름 — compatibility_type 컬럼에 저장된다 */
  name: string;
  /** 타입 한 줄 설명 (UI 표시용) */
  tagline: string;
};

/** 점수 내림차순 — 앞에서부터 첫 매치를 사용한다 */
export const COMPATIBILITY_TYPE_BANDS: CompatibilityTypeBand[] = [
  {
    min: 90,
    name: '영혼의 책벗',
    tagline: '책장이 거울처럼 닮았어요. 서로의 다음 책이 궁금하지 않을 정도로요.',
  },
  {
    min: 75,
    name: '나란히 걷는 독서가',
    tagline: '같은 방향을 보며 걷지만, 각자의 속도가 있는 사이예요.',
  },
  {
    min: 60,
    name: '서로의 책장이 궁금한 사이',
    tagline: '겹치는 책 사이사이, 낯선 책들이 대화거리가 되어줄 거예요.',
  },
  {
    min: 40,
    name: '다른 결, 같은 마음',
    tagline: '읽는 책은 다르지만, 책을 사랑하는 마음은 닮았어요.',
  },
  {
    min: 0,
    name: '서로에게 새로운 세계',
    tagline: '겹치는 책이 거의 없다는 건, 빌려 읽을 책이 가장 많다는 뜻이에요.',
  },
];

/**
 * 점수(0-100)에 해당하는 궁합 타입을 반환
 */
export const getCompatibilityTypeByScore = (
  score: number
): CompatibilityTypeBand => {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    COMPATIBILITY_TYPE_BANDS.find((band) => clamped >= band.min) ??
    COMPATIBILITY_TYPE_BANDS[COMPATIBILITY_TYPE_BANDS.length - 1]
  );
};
