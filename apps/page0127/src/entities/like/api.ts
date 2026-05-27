import { isAxiosError } from 'axios';

import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

/**
 * 좋아요 API 클라이언트
 *
 * 학습 포인트:
 * - 피드 API에서 좋아요 정보를 함께 조회하여 성능 최적화
 * - addLike/removeLike만 필요 (좋아요 조회는 피드에서 처리)
 * - apiClient(axios)로 통일: baseURL '/api' · 쿠키 · 인터셉터 공통 적용
 */

export const likeApi = {
  /**
   * 좋아요 추가
   */
  addLike: async (activityId: string): Promise<void> => {
    try {
      await apiClient.post(API_ENDPOINTS.activities.likes(activityId));
    } catch (error) {
      // 409는 중복 좋아요이므로 무시 (이미 좋아요 상태)
      if (isAxiosError(error) && error.response?.status === 409) {
        return;
      }
      throw error;
    }
  },

  /**
   * 좋아요 취소
   */
  removeLike: async (activityId: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.activities.likes(activityId));
  },
};
