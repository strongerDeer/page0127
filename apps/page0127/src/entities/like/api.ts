import { isAxiosError } from 'axios';

import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

/**
 * 책 단위 좋아요 API 클라이언트
 *
 * 학습 포인트:
 * - 좋아요 대상은 활동이 아니라 책이다. 한 책이 카드 1장이므로 숫자 기준도 책으로 통일했다.
 * - 목록 조회가 없다 — 피드·상세 응답에 count/isLiked가 함께 실려 온다.
 * - 409(중복)는 무시한다. 이미 눌린 상태라 사용자 입장에선 성공과 구분할 필요가 없다.
 */
export const bookLikeApi = {
  addLike: async (bookId: string): Promise<void> => {
    try {
      await apiClient.post(API_ENDPOINTS.books.likes(bookId));
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) return;
      throw error;
    }
  },

  removeLike: async (bookId: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.books.likes(bookId));
  },
};
