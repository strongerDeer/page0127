/**
 * Activity 엔티티 Query Keys
 * 활동(피드) 관련 React Query 쿼리 키 관리
 */

import type { FeedFilter } from './types';

export const activityKeys = {
  // 모든 활동 관련 쿼리의 기본 키
  all: ['activities'] as const,

  // 피드 목록 조회 관련
  feeds: () => [...activityKeys.all, 'feed'] as const,
  feed: (filter?: FeedFilter) => [...activityKeys.feeds(), filter] as const,

  // 상세 조회 관련
  details: () => [...activityKeys.all, 'detail'] as const,
  detail: (id: string) => [...activityKeys.details(), id] as const,

  // 댓글 관련
  comments: (activityId: string) =>
    [...activityKeys.detail(activityId), 'comments'] as const,

  // 좋아요 관련
  likes: (activityId: string) =>
    [...activityKeys.detail(activityId), 'likes'] as const,
} as const;
