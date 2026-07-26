import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

import {
  Comment,
  CommentTarget,
  CreateCommentRequest,
  UpdateCommentRequest,
} from './types';

/**
 * 댓글 API 클라이언트
 *
 * 학습 포인트:
 * - 대상(개인 책 / 전역 책)에 따라 엔드포인트만 갈라지고 나머지는 같다.
 *   분기를 한 곳(resolve)에 모아 호출부는 대상만 넘기게 한다.
 * - apiClient(axios)로 통일: 응답 본문은 response.data, 에러는 인터셉터/AxiosError로 일원화
 */

const resolve = {
  list: (target: CommentTarget) =>
    target.type === 'book'
      ? API_ENDPOINTS.books.comments(target.id)
      : API_ENDPOINTS.globalBooks.comments(target.id),
  detail: (target: CommentTarget, commentId: string) =>
    target.type === 'book'
      ? API_ENDPOINTS.books.commentDetail(target.id, commentId)
      : API_ENDPOINTS.globalBooks.commentDetail(target.id, commentId),
};

export const commentApi = {
  /**
   * 댓글 목록 조회
   */
  getComments: async (target: CommentTarget): Promise<Comment[]> => {
    // successResponse는 데이터를 직접 반환 (data 래핑 없음)
    const { data } = await apiClient.get<Comment[]>(resolve.list(target));
    return data ?? [];
  },

  /**
   * 댓글 작성
   */
  createComment: async (
    target: CommentTarget,
    request: CreateCommentRequest
  ): Promise<Comment> => {
    const { data } = await apiClient.post<Comment>(
      resolve.list(target),
      request
    );
    return data;
  },

  /**
   * 댓글 수정
   */
  updateComment: async (
    target: CommentTarget,
    commentId: string,
    request: UpdateCommentRequest
  ): Promise<Comment> => {
    const { data } = await apiClient.patch<Comment>(
      resolve.detail(target, commentId),
      request
    );
    return data;
  },

  /**
   * 댓글 삭제
   */
  deleteComment: async (
    target: CommentTarget,
    commentId: string
  ): Promise<void> => {
    await apiClient.delete(resolve.detail(target, commentId));
  },
};
