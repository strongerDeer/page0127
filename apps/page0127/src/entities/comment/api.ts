import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

import { Comment, CreateCommentRequest, UpdateCommentRequest } from './types';

/**
 * 댓글 API 클라이언트
 *
 * 학습 포인트:
 * - CRUD 기본 패턴 (Create, Read, Update, Delete)
 * - 계층 구조 데이터 처리 (댓글 + 대댓글)
 * - apiClient(axios)로 통일: 응답 본문은 response.data, 에러는 인터셉터/AxiosError로 일원화
 */

export const commentApi = {
  /**
   * 댓글 목록 조회
   */
  getComments: async (activityId: string): Promise<Comment[]> => {
    // successResponse는 데이터를 직접 반환 (data 래핑 없음)
    const { data } = await apiClient.get<Comment[]>(
      API_ENDPOINTS.activities.comments(activityId)
    );
    return data ?? [];
  },

  /**
   * 댓글 작성
   */
  createComment: async (
    activityId: string,
    request: CreateCommentRequest
  ): Promise<Comment> => {
    const { data } = await apiClient.post<Comment>(
      API_ENDPOINTS.activities.comments(activityId),
      request
    );
    return data;
  },

  /**
   * 댓글 수정
   */
  updateComment: async (
    activityId: string,
    commentId: string,
    request: UpdateCommentRequest
  ): Promise<Comment> => {
    const { data } = await apiClient.patch<Comment>(
      API_ENDPOINTS.activities.commentDetail(activityId, commentId),
      request
    );
    return data;
  },

  /**
   * 댓글 삭제
   */
  deleteComment: async (
    activityId: string,
    commentId: string
  ): Promise<void> => {
    await apiClient.delete(
      API_ENDPOINTS.activities.commentDetail(activityId, commentId)
    );
  },
};
