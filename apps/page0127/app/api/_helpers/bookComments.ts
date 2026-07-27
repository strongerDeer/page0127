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
  { book_id: string } | { global_book_id: string };

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

/**
 * ISO 8601 시각 문자열 비교
 *
 * 학습 포인트:
 * - `localeCompare`를 쓰면 안 된다. 로케일 대조는 '.' 같은 구두점을 무시할 수 있어
 *   '…:05.123456+00:00'과 '…:05+00:00'을 비교하면 순서가 뒤집힌다. Postgres는
 *   마이크로초가 0이면 소수부를 생략하므로 이 조합이 실제로 나온다.
 * - ISO 8601은 사전순 = 시간순이 되도록 설계된 형식이라 단순 비교가 정확하고 빠르다.
 */
export const compareIsoTime = (a: string, b: string) =>
  a < b ? -1 : a > b ? 1 : 0;

const byCreatedAt = (a: { createdAt: string }, b: { createdAt: string }) =>
  compareIsoTime(a.createdAt, b.createdAt);

/** DB 에러를 클라이언트가 이해할 수 있는 상태코드로 분류한 결과 */
export type ClassifiedError = { message: string; status: number };

/**
 * Postgres/PostgREST 에러를 라우트가 그대로 쓸 수 있는 { message, status }로 분류한다.
 *
 * 학습 포인트:
 * - 이 함수는 순수 함수다(NextResponse 등 프레임워크 의존 없음) — 라우트에서 이 결과를
 *   그대로 errorResponse(message, status)에 넘기면 된다. DB 트리거 문구가 바뀌는 사고를
 *   테스트로 잡기 위해 매핑 규칙을 여기 한 곳에 모아둔다(Task 4·5·7이 공유).
 * - RLS 위반(42501 또는 "row-level security" 문구)은 403으로 매핑해 "권한 없음"과
 *   "서버 고장"을 구분하고, 내부 테이블/정책 이름이 그대로 클라이언트에 노출되지 않게 한다.
 */
export function classifyBookCommentError(error: {
  code?: string;
  message: string;
}): ClassifiedError {
  if (error.message.includes('1depth')) {
    return { message: '대댓글의 대댓글은 작성할 수 없습니다.', status: 400 };
  }
  if (error.message.includes('다른 대상')) {
    return { message: '잘못된 답글 대상입니다.', status: 400 };
  }
  if (error.code === '42501' || error.message.includes('row-level security')) {
    return { message: '권한이 없습니다.', status: 403 };
  }
  return { message: error.message, status: 500 };
}

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
