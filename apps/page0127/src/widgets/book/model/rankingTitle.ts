/**
 * 랭킹 제목은 표본 크기에 따라 말을 바꾼다.
 *
 * 왜: 독자가 적을 때 "가장 많은 사람의 인생책"이라고 쓰면, 1위가 1~2명이 고른 책인데도
 * 규모를 주장하게 된다. 처음 온 사람은 랭킹이 아니라 **과장**을 본다.
 * 그래서 얇은 동안은 규모 대신 화자("리더들이")를 말하고, 1위가 이 인원을 넘는 순간
 * 원래 제목으로 저절로 돌아간다 — 사람이 늘었을 때 다시 손댈 필요가 없다.
 *
 * 'most' 는 전체 기간 누적 완독 수다(get_book_ranking_with_delta 에 기간 조건이 없다).
 * 그래서 어느 쪽 제목에도 "이번 주" 같은 기간을 붙이지 않는다.
 */
export const RANKING_CROWD_MIN = 10;

type RankingType = 'best' | 'most';

const TITLES: Record<RankingType, { thin: string; crowd: string }> = {
  most: { thin: '리더들이 완독한 책', crowd: '많이 읽힌 책' },
  best: { thin: '리더들이 고른 인생책', crowd: '가장 많은 사람의 인생책' },
};

/** 랭킹 근거 수치("12명이 완독")를 적을 만한 인원인가 — 제목 복귀와 같은 기준 */
export const isCrowdCount = (count: number): boolean =>
  count >= RANKING_CROWD_MIN;

/** 데이터를 보고 정하는 제목 — 1위(가장 큰 인원)가 기준을 넘어야 "많이"라고 말한다 */
export const toRankingTitle = (
  type: RankingType,
  books: { count: number }[]
): string => {
  const top = Math.max(0, ...books.map((b) => b.count));
  return isCrowdCount(top) ? TITLES[type].crowd : TITLES[type].thin;
};

/** 데이터를 모르는 자리(에러 화면)의 제목 — 모를 때는 규모를 주장하지 않는 쪽 */
export const rankingFallbackTitle = (type: RankingType): string =>
  TITLES[type].thin;
