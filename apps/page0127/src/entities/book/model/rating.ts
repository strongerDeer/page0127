/**
 * 평점의 의미를 한 곳에 모은다.
 *
 * DB의 rating 컬럼은 0, 1, 2, 3, 4, 5, 10 을 갖는데 이 값들은 균일한 척도가 아니다.
 * - 0  = "평가 안 함" (점수가 아니다)
 * - 10 = "인생책"     (11번째 점수가 아니라 최고점의 별칭)
 *
 * 이 사실이 코드 곳곳에 흩어져 있어 평균 평점이 양쪽으로 왜곡됐다.
 * 판정과 변환을 모두 이 파일로 모아, 나중에 컬럼을 분리할 때 고칠 자리가 한 곳이 되게 한다.
 */

/** 평균 평점 만점 — 화면 표기(`N / 5`)에도 이 값을 쓴다 */
export const RATING_MAX = 5;

/**
 * 평균에 넣을 수 있는 평가인지 판정한다.
 * null은 미평가, 0은 "평가 안 함"이라 둘 다 제외한다.
 */
export const isRated = (rating: number | null): rating is number =>
  rating !== null && rating > 0;

/**
 * DB의 rating을 5점 만점 점수로 접는다.
 * 10은 "인생책"이라는 뜻의 최고점이므로 만점과 같게 본다.
 */
export const toScore = (rating: number): number =>
  rating === 10 ? RATING_MAX : rating;

/** 인생책 판정 — DB 함수 get_books_of_life 와 같은 정의(rating = 10)를 쓴다 */
export const isLifeBook = (rating: number | null): boolean => rating === 10;

/** 최고 평가 판정 — 5점과 인생책. 책장에서 표지를 크게 보여줄 기준이다 */
export const isTopRated = (rating: number | null): boolean =>
  isRated(rating) && toScore(rating) === RATING_MAX;

/** 평점 목록의 평균 (소수 1자리). 평가 안 함(0)·미평가(null)는 제외한다 */
export const averageScore = (ratings: (number | null)[]): number => {
  const scores = ratings.filter(isRated).map(toScore);
  if (scores.length === 0) return 0;

  const sum = scores.reduce((total, score) => total + score, 0);
  return Math.round((sum / scores.length) * 10) / 10;
};
