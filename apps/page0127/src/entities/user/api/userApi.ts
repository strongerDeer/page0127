import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

import { UserWithFollowInfo } from '@/entities/follow';

/**
 * 사용자 API 함수
 *
 * 학습 포인트:
 * - URLSearchParams로 쿼리 파라미터 구성
 * - axios GET 요청 시 params 옵션 사용
 */
export const userApi = {
  /**
   * 사용자 검색
   * @param query 검색어 (닉네임 또는 사용자명)
   */
  searchUsers: async (query: string): Promise<UserWithFollowInfo[]> => {
    const response = await apiClient.get<UserWithFollowInfo[]>(
      API_ENDPOINTS.users.search,
      {
        params: { q: query },
      }
    );
    return response.data;
  },
};
