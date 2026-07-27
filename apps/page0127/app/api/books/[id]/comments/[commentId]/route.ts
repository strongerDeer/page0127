import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../../_helpers/auth';
import {
  buildCommentTree,
  classifyBookCommentError,
} from '../../../../_helpers/bookComments';
import { errorResponse, successResponse } from '../../../../_helpers/response';

type Params = {
  params: Promise<{ id: string; commentId: string }>;
};

const COMMENT_COLUMNS =
  'id, user_id, parent_comment_id, content, created_at, updated_at';

/**
 * PATCH /api/books/[id]/comments/[commentId]
 * 개인 서재 책 스레드의 댓글 수정
 *
 * 학습 포인트:
 * - 작성자 확인을 앱에서 다시 하지 않는다. RLS UPDATE 정책이 본인 행만 허용하므로
 *   남의 댓글을 고치려 하면 대상 행이 아예 갱신되지 않는다. 그 상태에서 `.select().single()`이
 *   행을 하나도 못 받으면 PostgREST가 PGRST116(no rows) 에러를 내는데, 이건 book_comments
 *   트리거가 던지는 진짜 DB 에러가 아니라 "행이 안 보임"이라는 신호이므로 여기서만 따로
 *   403으로 처리하고, 그 외 에러는 classifyBookCommentError에 맡긴다.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { content } = await request.json();
    if (!content || content.trim().length === 0) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }

    const { data: comment, error } = await supabase
      .from('book_comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .eq('book_id', id)
      .select(COMMENT_COLUMNS)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('댓글을 수정할 권한이 없습니다.', 403);
      }
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }

    const profiles = comment.user_id
      ? (
          await supabase
            .from('profiles')
            .select('id, nickname, username, photo_url')
            .in('id', [comment.user_id])
        ).data ?? []
      : [];

    const [node] = buildCommentTree([comment], profiles);
    return successResponse(node);
  } catch (error) {
    console.error('책 댓글 수정 에러:', error);
    return errorResponse('댓글 수정에 실패했습니다.');
  }
}

/**
 * DELETE /api/books/[id]/comments/[commentId]
 * 대댓글은 FK ON DELETE CASCADE로 함께 지워진다.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { error, count } = await supabase
      .from('book_comments')
      .delete({ count: 'exact' })
      .eq('id', commentId)
      .eq('book_id', id);

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }
    if (!count) return errorResponse('댓글을 삭제할 권한이 없습니다.', 403);

    return successResponse({ success: true });
  } catch (error) {
    console.error('책 댓글 삭제 에러:', error);
    return errorResponse('댓글 삭제에 실패했습니다.');
  }
}
