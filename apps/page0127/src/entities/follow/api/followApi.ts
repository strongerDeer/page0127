import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

import type { Follow, FollowInput, FollowStats, UserWithFollowInfo } from '../types';

/**
 * 팔로우 관련 API 함수 모음
 *
 * 학습 포인트:
 * - RESTful API 패턴 적용
 * - 팔로우/언팔로우는 토글 방식이 아닌 명시적 API 호출
 * - 통계 조회는 별도 엔드포인트로 분리 (성능 최적화)
 */
export const followApi = {
  /**
   * 팔로우하기
   * POST /api/follows
   */
  followUser: async (followInput: FollowInput): Promise<Follow> => {
    const response = await apiClient.post<Follow>(
      API_ENDPOINTS.follows.follow,
      followInput
    );
    return response.data;
  },

  /**
   * 언팔로우하기
   * DELETE /api/follows/:userId
   */
  unfollowUser: async (userId: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.follows.unfollow(userId));
  },

  /**
   * 팔로워 목록 조회 (나를 팔로우하는 사람들)
   * GET /api/follows/:userId/followers
   */
  getFollowers: async (userId: string): Promise<UserWithFollowInfo[]> => {
    const response = await apiClient.get<UserWithFollowInfo[]>(
      API_ENDPOINTS.follows.followers(userId)
    );
    return response.data;
  },

  /**
   * 팔로잉 목록 조회 (내가 팔로우하는 사람들)
   * GET /api/follows/:userId/following
   */
  getFollowing: async (userId: string): Promise<UserWithFollowInfo[]> => {
    const response = await apiClient.get<UserWithFollowInfo[]>(
      API_ENDPOINTS.follows.following(userId)
    );
    return response.data;
  },

  /**
   * 팔로우 통계 조회
   * GET /api/follows/:userId/stats
   */
  getFollowStats: async (userId: string): Promise<FollowStats> => {
    const response = await apiClient.get<FollowStats>(
      API_ENDPOINTS.follows.stats(userId)
    );
    return response.data;
  },

  /**
   * 팔로우 여부 확인
   * GET /api/follows/:userId/is-following
   */
  isFollowing: async (userId: string): Promise<boolean> => {
    const response = await apiClient.get<{ is_following: boolean }>(
      API_ENDPOINTS.follows.isFollowing(userId)
    );
    return response.data.is_following;
  },
};
