/**
 * "얼굴까지 보여 줘도 되는 사람" 기준 (2026-10-31 결정)
 * = 나 + 내가 팔로우하는 사람 + 나를 팔로우하는 사람.
 *
 * 책 상세 "이 책을 읽은 리더"와 리더 찾기 추천이 같은 기준을 쓴다.
 */
/** follows 테이블 행 — 나와 이어진 방향만 받아 온다 */
export type FollowEdge = {
  follower_id: string;
  following_id: string;
};

/**
 * 책 상세에서 "얼굴까지 보여 줘도 되는 사람" = 나 + 내가 팔로우하는 사람 + 나를 팔로우하는 사람.
 *
 * 왜 이렇게 좁히나:
 * - 서로 모르는 사람의 닉네임·사진이 책마다 줄줄이 뜨면, 그 사람이 무슨 책을 읽는지가
 *   본인이 모르는 사이에 낯선 사람에게 계속 노출된다(개인정보 관점).
 * - 이미 팔로우 관계가 있다면 서로 서재를 볼 수 있는 사이라 새로 드러나는 정보가 없다.
 * - 그 밖의 사람은 "몇 명이 읽었는지" 숫자로만 알린다.
 */
export const toConnectionIds = (
  edges: FollowEdge[],
  myId: string
): Set<string> => {
  const ids = new Set<string>([myId]);
  for (const { follower_id, following_id } of edges) {
    // 내가 팔로우 → 상대는 following_id, 나를 팔로우 → 상대는 follower_id
    ids.add(follower_id === myId ? following_id : follower_id);
  }
  return ids;
};
