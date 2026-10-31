/**
 * 책 상세 "이 책을 읽은 리더" — 책 기록 행을 사람 단위로 묶는다.
 *
 * 학습 포인트:
 * - 같은 사람이 재독하면 행이 여러 개다. 행을 그대로 그리면 한 사람이 두 번 나온다.
 * - 재독 중인 사람의 최근 행은 '읽는 중'이지만 이미 한 번 끝까지 읽었다
 *   → 순서는 최근 행 기준, 상태는 완독을 우선한다.
 */

export type ReaderStatus = 'reading' | 'completed';

/** books 테이블에서 받아 오는 최소 필드 (updated_at 내림차순으로 들어온다고 가정) */
export type BookReaderRow = {
  user_id: string;
  status: ReaderStatus | 'want_to_read';
};

export type BookReader = {
  userId: string;
  status: ReaderStatus;
};

export const pickBookReaders = (
  rows: BookReaderRow[],
  max: number
): { readers: BookReader[]; total: number } => {
  // Map 은 처음 넣은 순서를 지킨다 → 그 사람의 가장 최근 행 자리에 고정된다
  const byUser = new Map<string, ReaderStatus>();

  for (const { user_id, status } of rows) {
    // '읽고 싶은 책'은 아직 읽지 않았다 — "읽은 리더"가 아니다
    if (status === 'want_to_read') continue;
    if (byUser.get(user_id) === 'completed') continue;
    byUser.set(user_id, status);
  }

  const readers = [...byUser].map(([userId, status]) => ({ userId, status }));
  return { readers: readers.slice(0, max), total: readers.length };
};

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
