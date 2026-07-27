import type { CommentTarget } from '../types';

/**
 * Comment 엔티티 Query Keys
 * 댓글 관련 React Query 쿼리 키 관리
 *
 * 학습 포인트:
 * - 키에 대상 종류를 포함시켜, 같은 UUID라도 개인 책과 전역 책 캐시가 섞이지 않게 한다.
 */
export const commentKeys = {
  // 모든 댓글 관련 쿼리의 기본 키
  all: ['comments'] as const,

  // 특정 대상(개인 책 / 전역 책)의 댓글 목록
  byTarget: (target: CommentTarget) =>
    [...commentKeys.all, target.type, target.id] as const,

  // 댓글 상세
  details: () => [...commentKeys.all, 'detail'] as const,
  detail: (id: string) => [...commentKeys.details(), id] as const,
} as const;
