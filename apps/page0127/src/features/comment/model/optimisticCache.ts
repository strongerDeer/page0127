import type { Comment } from '@/entities/comment';

/**
 * 댓글 캐시(트리)를 바꾸는 순수 함수들 — 낙관적 업데이트용
 *
 * 학습 포인트:
 * - React Query 캐시는 불변으로 다뤄야 한다. 배열·객체를 새로 만들어야 구독 중인
 *   컴포넌트가 바뀐 줄 안다(참조 비교).
 * - 컴포넌트에서 떼어 두면 DB·화면 없이 단위 테스트할 수 있다.
 */

/** 새 댓글을 트리에 붙인다 — 루트면 맨 뒤(시간순), 답글이면 부모의 replies 맨 뒤 */
export const addOptimisticComment = (
  comments: Comment[],
  comment: Comment
): Comment[] => {
  if (!comment.parentCommentId) return [...comments, comment];
  return comments.map((root) =>
    root.id === comment.parentCommentId
      ? { ...root, replies: [...(root.replies ?? []), comment] }
      : root
  );
};

/** 임시 댓글을 서버가 돌려준 진짜 댓글로 바꾼다(루트·답글 어디에 있든) */
export const replaceComment = (
  comments: Comment[],
  tempId: string,
  next: Comment
): Comment[] =>
  comments.map((root) => {
    if (root.id === tempId) return { ...next, replies: root.replies ?? [] };
    if (!root.replies?.some((r) => r.id === tempId)) return root;
    return {
      ...root,
      replies: root.replies.map((r) => (r.id === tempId ? next : r)),
    };
  });

/** 대댓글까지 센 전체 개수 */
export const countComments = (comments: Comment[]): number =>
  comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);

/** 아직 서버에 저장되기 전(낙관적) 댓글인지 */
export const isPendingComment = (comment: Comment) =>
  comment.id.startsWith('temp-');
