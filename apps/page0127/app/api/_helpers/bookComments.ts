/**
 * 책 단위 댓글 공용 로직
 *
 * 학습 포인트:
 * - 라우트(개인 책 / 전역 책)는 대상 컬럼만 다르고 나머지가 같다.
 *   판단 로직을 순수 함수로 빼두면 라우트는 얇아지고 테스트는 DB 없이 돈다.
 */

export type CommentRow = {
  id: string;
  user_id: string | null;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  nickname: string | null;
  username: string | null;
  photo_url: string | null;
};

export type CommentUser = {
  id: string;
  nickname: string | null;
  photoUrl: string | null;
};

export type CommentNode = {
  id: string;
  userId: string | null;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: CommentUser | null;
  replies: CommentNode[];
};

/** 대상 컬럼 — 라우트가 어느 쪽 책인지 정해서 넘긴다 */
export type CommentTargetColumn =
  | { book_id: string }
  | { global_book_id: string };

const toUser = (
  userId: string | null,
  profiles: Map<string, ProfileRow>
): CommentUser | null => {
  if (!userId) return null; // 탈퇴한 사용자
  const profile = profiles.get(userId);
  return {
    id: userId,
    // 닉네임 미설정 시 username으로 대체 (익명 방지)
    nickname: profile?.nickname || profile?.username || null,
    photoUrl: profile?.photo_url || null,
  };
};

const byCreatedAt = (a: { createdAt: string }, b: { createdAt: string }) =>
  a.createdAt.localeCompare(b.createdAt);

export function buildCommentTree(
  rows: CommentRow[],
  profiles: ProfileRow[]
): CommentNode[] {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const nodes = rows.map<CommentNode>((row) => ({
    id: row.id,
    userId: row.user_id,
    parentCommentId: row.parent_comment_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: toUser(row.user_id, profileMap),
    replies: [],
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const roots: CommentNode[] = [];

  for (const node of nodes) {
    const parent = node.parentCommentId
      ? nodeMap.get(node.parentCommentId)
      : undefined;

    // 부모가 목록에 없으면(권한으로 잘렸거나 삭제됨) 버리지 않고 루트로 올린다.
    // 대댓글이 통째로 사라지는 것보다 낫다.
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  roots.sort(byCreatedAt);
  for (const root of roots) root.replies.sort(byCreatedAt);

  return roots;
}
