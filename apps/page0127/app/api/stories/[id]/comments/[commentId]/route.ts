import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../../_helpers/auth';
import {
  buildCommentTree,
  classifyBookCommentError,
  COMMENT_MAX_LENGTH,
} from '../../../../_helpers/bookComments';
import { errorResponse, successResponse } from '../../../../_helpers/response';

import type { CommentRow } from '../../../../_helpers/bookComments';

type Params = {
  params: Promise<{ id: string; commentId: string }>;
};

const COMMENT_COLUMNS =
  'id, user_id, parent_comment_id, content, created_at, updated_at';

/**
 * PATCH /api/stories/[id]/comments/[commentId]
 * 책 이야기 댓글 수정 — 본인 것만(RLS). 남의 댓글이면 갱신된 행이 없어 PGRST116 → 403.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { error: authError } = await getCurrentUser();
    if (authError) return authError;

    const body = await request.json().catch(() => null);
    const content: unknown = body?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }
    if (content.trim().length > COMMENT_MAX_LENGTH) {
      return errorResponse(
        `댓글은 ${COMMENT_MAX_LENGTH}자까지 쓸 수 있어요.`,
        400
      );
    }

    const { data: comment, error } = await supabase
      .from('story_comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .eq('story_id', id)
      .select(COMMENT_COLUMNS)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('댓글을 수정할 권한이 없습니다.', 403);
      }
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }

    const row = comment as CommentRow;
    const { data: profiles } = row.user_id
      ? await supabase
          .from('profiles')
          .select('id, nickname, username, photo_url')
          .in('id', [row.user_id])
      : { data: [] };

    const [node] = buildCommentTree([row], profiles ?? []);
    return successResponse(node);
  } catch (error) {
    console.error('책 이야기 댓글 수정 에러:', error);
    return errorResponse('댓글 수정에 실패했습니다.');
  }
}

/**
 * DELETE /api/stories/[id]/comments/[commentId]
 * 답글은 FK ON DELETE CASCADE 로 함께 지워진다.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { error, count } = await supabase
      .from('story_comments')
      .delete({ count: 'exact' })
      .eq('id', commentId)
      .eq('story_id', id);

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }
    if (!count) return errorResponse('댓글을 삭제할 권한이 없습니다.', 403);

    return successResponse({ success: true });
  } catch (error) {
    console.error('책 이야기 댓글 삭제 에러:', error);
    return errorResponse('댓글 삭제에 실패했습니다.');
  }
}
