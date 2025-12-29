import { API_ENDPOINTS } from '@/shared/config/endpoints';

import { Comment, CreateCommentRequest, UpdateCommentRequest } from './types';

/**
 * 댓글 API 클라이언트
 *
 * 학습 포인트:
 * - CRUD 기본 패턴 (Create, Read, Update, Delete)
 * - 계층 구조 데이터 처리 (댓글 + 대댓글)
 */

export const commentApi = {
  /**
   * 댓글 목록 조회
   */
  getComments: async (activityId: string): Promise<Comment[]> => {
    const response = await fetch(
      `/api${API_ENDPOINTS.activities.comments(activityId)}`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '댓글 조회에 실패했습니다.');
    }

    const data = await response.json();
    // successResponse는 데이터를 직접 반환 (data 래핑 없음)
    return data || [];
  },

  /**
   * 댓글 작성
   */
  createComment: async (
    activityId: string,
    request: CreateCommentRequest
  ): Promise<Comment> => {
    const response = await fetch(
      `/api${API_ENDPOINTS.activities.comments(activityId)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '댓글 작성에 실패했습니다.');
    }

    const data = await response.json();
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
    const response = await fetch(
      `/api${API_ENDPOINTS.activities.commentDetail(activityId, commentId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '댓글 수정에 실패했습니다.');
    }

    const data = await response.json();
    return data;
  },

  /**
   * 댓글 삭제
   */
  deleteComment: async (
    activityId: string,
    commentId: string
  ): Promise<void> => {
    const response = await fetch(
      `/api${API_ENDPOINTS.activities.commentDetail(activityId, commentId)}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '댓글 삭제에 실패했습니다.');
    }
  },
};
