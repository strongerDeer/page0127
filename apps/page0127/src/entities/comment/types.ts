/**
 * 댓글 엔티티 타입 정의
 *
 * 학습 포인트:
 * - 계층 구조 (댓글 + 대댓글)
 * - parentCommentId로 댓글/대댓글 구분
 * - replies 배열로 대댓글 표현
 */

export type Comment = {
  id: string;
  activityId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nickname: string | null;
    photoUrl: string | null;
  };
  replies?: Comment[]; // 대댓글 목록 (1depth만)
};

export type CreateCommentRequest = {
  content: string;
  parentCommentId?: string | null;
};

export type UpdateCommentRequest = {
  content: string;
};
