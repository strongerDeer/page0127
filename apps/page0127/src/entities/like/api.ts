import { API_ENDPOINTS } from '@/shared/config/endpoints';

/**
 * 좋아요 API 클라이언트
 *
 * 학습 포인트:
 * - 피드 API에서 좋아요 정보를 함께 조회하여 성능 최적화
 * - addLike/removeLike만 필요 (좋아요 조회는 피드에서 처리)
 */

export const likeApi = {
  /**
   * 좋아요 추가
   */
  addLike: async (activityId: string): Promise<void> => {
    const response = await fetch(
      `/api${API_ENDPOINTS.activities.likes(activityId)}`,
      {
        method: 'POST',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      // 409는 중복 좋아요이므로 무시 (이미 좋아요 상태)
      if (response.status === 409) {
        console.log('이미 좋아요 상태입니다.');
        return;
      }
      const error = await response.json();
      throw new Error(error.error || '좋아요 추가에 실패했습니다.');
    }
  },

  /**
   * 좋아요 취소
   */
  removeLike: async (activityId: string): Promise<void> => {
    const response = await fetch(
      `/api${API_ENDPOINTS.activities.likes(activityId)}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('좋아요 취소에 실패했습니다.');
    }
  },
};
