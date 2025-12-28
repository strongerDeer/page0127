import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

import { Activity, FeedParams } from '../types';

/**
 * 활동 피드 API 함수
 *
 * 학습 포인트:
 * - 페이지네이션 파라미터 처리
 * - 무한 스크롤을 위한 offset 기반 페이징
 */
export const activityApi = {
  /**
   * 팔로잉한 사용자들의 활동 피드 조회
   */
  getFeed: async (params?: FeedParams): Promise<Activity[]> => {
    const { limit = 20, offset = 0 } = params || {};
    const response = await apiClient.get<Activity[]>(API_ENDPOINTS.feed.list, {
      params: { limit, offset },
    });
    return response.data;
  },
};
