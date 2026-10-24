import type { Badge } from './badges';

/**
 * 저장 전후 뱃지를 비교해 이번 저장으로 새로 받은 것만 고른다.
 *
 * - 처음 받은 뱃지
 * - 단계가 오른 성장 뱃지 (책장 10권 → 50권 등)
 *
 * 받은 책(근거)만 바뀐 경우는 고르지 않는다. 지난 날짜로 완독을 넣으면 n번째 책이
 * 앞당겨질 뿐 새로 받은 게 아니기 때문이다.
 */
export const newlyEarnedBadges = (before: Badge[], after: Badge[]): Badge[] => {
  const previous = new Map(before.map((badge) => [badge.id, badge]));
  return after.filter((badge) => {
    if (!badge.earned) return false;
    const prev = previous.get(badge.id);
    return !prev?.earned || badge.level > prev.level;
  });
};
