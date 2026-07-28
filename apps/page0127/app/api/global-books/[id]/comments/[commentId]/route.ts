import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../../_helpers/auth';
import {
  buildCommentTree,
  classifyBookCommentError,
} from '../../../../_helpers/bookComments';
import { errorResponse, successResponse } from '../../../../_helpers/response';

import type { CommentRow, ProfileRow } from '../../../../_helpers/bookComments';

type Params = {
  params: Promise<{ id: string; commentId: string }>;
};

const COMMENT_COLUMNS =
  'id, user_id, parent_comment_id, content, created_at, updated_at';

/**
 * PATCH /api/global-books/[id]/comments/[commentId]
 * 전역 책 댓글 수정
 *
 * 학습 포인트:
 * - 권한을 앱에서 다시 확인하지 않는다. RLS의 UPDATE 정책이 본인 댓글만 허용하고,
 *   WITH CHECK가 대상 재지정(다른 책으로 옮기기)까지 막는다.
 * - 그래서 남의 댓글을 고치려 하면 대상 행이 0건이 되어 .single()이 실패한다 → 404.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { content } = await request.json();
    if (!content?.trim()) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }

    const { data, error } = await supabase
      .from('book_comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .eq('global_book_id', id)
      .select(COMMENT_COLUMNS)
      .single();

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }
    if (!data) return errorResponse('댓글을 찾을 수 없습니다.', 404);

    const row = data as CommentRow;
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, nickname, username, photo_url')
      .eq('id', row.user_id ?? '');

    const [node] = buildCommentTree([row], (profileRows ?? []) as ProfileRow[]);

    return successResponse(node);
  } catch (error) {
    console.error('전역 책 댓글 수정 에러:', error);
    return errorResponse('댓글 수정에 실패했습니다.');
  }
}

/**
 * DELETE /api/global-books/[id]/comments/[commentId]
 * 전역 책 댓글 삭제 — 대댓글은 FK ON DELETE CASCADE로 함께 지워진다.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { error } = await supabase
      .from('book_comments')
      .delete()
      .eq('id', commentId)
      .eq('global_book_id', id);

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }

    return successResponse({ message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    console.error('전역 책 댓글 삭제 에러:', error);
    return errorResponse('댓글 삭제에 실패했습니다.');
  }
}
