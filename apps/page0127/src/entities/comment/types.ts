/**
 * 댓글 엔티티 타입 정의
 *
 * 학습 포인트:
 * - 계층 구조 (댓글 + 대댓글)
 * - parentCommentId로 댓글/대댓글 구분
 * - replies 배열로 대댓글 표현
 * - 탈퇴한 사용자 처리: userId와 user가 null일 수 있음
 */

/**
 * 댓글이 붙는 대상
 *
 * 학습 포인트:
 * - 댓글은 활동이 아니라 책에 붙는다. 개인 서재 책과 전역 책 두 종류가 있어
 *   구별 유니온으로 표현한다.
 */
export type CommentTarget =
  { type: 'book'; id: string } | { type: 'globalBook'; id: string };

export type Comment = {
  id: string;
  userId: string | null; // 탈퇴한 사용자의 경우 null
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nickname: string | null;
    /** 프로필 경로(/{username})용 — 표시용 nickname 과 달리 폴백하지 않는다 */
    username: string | null;
    photoUrl: string | null;
  } | null; // 탈퇴한 사용자의 경우 null (UI에서 "탈퇴한 사용자"로 표시)
  replies?: Comment[]; // 대댓글 목록 (1depth만)
};

export type CreateCommentRequest = {
  content: string;
  parentCommentId?: string | null;
};

export type UpdateCommentRequest = {
  content: string;
};
