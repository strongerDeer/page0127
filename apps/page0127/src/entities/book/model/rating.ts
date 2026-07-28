/**
 * 평점의 의미를 한 곳에 모은다.
 *
 * DB의 rating 컬럼은 0, 1, 2, 3, 4, 5 를 갖는다 (CHECK 제약으로 강제된다).
 * - 0 = "평가 안 함" (점수가 아니다)
 *
 * "인생책"은 더 이상 rating=10 이라는 매직값이 아니라 books.is_life_book 이라는
 * 별도 컬럼이다 (분리 이전에는 이 파일이 10 을 5점으로 접는 toScore, rating=10 을
 * 판정하는 isLifeBook 을 두고 있었다 — 분리가 끝났으니 둘 다 필요 없다).
 * 판정과 평균 계산의 단일 출처라는 역할은 그대로 이 파일에 남는다.
 */

/** 평균 평점 만점 — 화면 표기(`N / 5`)에도 이 값을 쓴다 */
export const RATING_MAX = 5;

/**
 * 평균에 넣을 수 있는 평가인지 판정한다.
 * null은 미평가, 0은 "평가 안 함"이라 둘 다 제외한다.
 */
export const isRated = (rating: number | null): rating is number =>
  rating !== null && rating > 0;

/** 최고 평가 판정 — 5점과 인생책. 책장에서 표지를 크게 보여줄 기준이다 */
export const isTopRated = (
  rating: number | null,
  isLifeBook: boolean
): boolean => isLifeBook || rating === RATING_MAX;

/** 평점 목록의 평균 (소수 1자리). 평가 안 함(0)·미평가(null)는 제외한다 */
export const averageScore = (ratings: (number | null)[]): number => {
  const scores = ratings.filter(isRated);
  if (scores.length === 0) return 0;

  const sum = scores.reduce((total, score) => total + score, 0);
  return Math.round((sum / scores.length) * 10) / 10;
};

/**
 * 평점 행 목록 → 화면에 쓸 요약. 평균과 권수가 같은 기준을 쓰도록 한곳에서 만든다.
 *
 * "4.5 / 5 (12)" 처럼 평균과 괄호 숫자를 나란히 적는 자리에서, 두 값을 각자
 * 계산하면 분모가 갈라진다(평균은 0을 빼는데 권수는 세는 식). 그래서 함께 만든다.
 */
export const summarizeRatings = (ratings: (number | null)[]) => ({
  average: averageScore(ratings),
  ratedCount: ratings.filter(isRated).length,
});
