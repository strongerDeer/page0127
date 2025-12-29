import { NextRequest } from 'next/server';

import {
  getCurrentUser,
  getSupabaseClient,
} from '../../../../_helpers/auth';
import { errorResponse, successResponse } from '../../../../_helpers/response';

type Params = {
  params: Promise<{ id: string; commentId: string }>;
};

/**
 * PATCH /api/activities/[id]/comments/[commentId]
 * 댓글 수정
 *
 * 학습 포인트:
 * - RLS 정책으로 본인의 댓글만 수정 가능
 * - updated_at은 트리거로 자동 업데이트
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }

    // 댓글 수정 (RLS로 본인 댓글만 수정 가능)
    const { data: comment, error } = await supabase
      .from('activity_comments')
      .update({
        content: content.trim(),
      })
      .eq('id', commentId)
      .eq('activity_id', id)
      .eq('user_id', user!.id)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message);
    }

    if (!comment) {
      return errorResponse('댓글을 찾을 수 없거나 수정 권한이 없습니다.', 404);
    }

    // 작성자 프로필 정보 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, photo_url')
      .eq('id', user!.id)
      .single();

    return successResponse({
      id: comment.id,
      activityId: id,
      userId: comment.user_id,
      parentCommentId: comment.parent_comment_id,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      user: {
        id: user!.id,
        nickname: profile?.nickname || null,
        photoUrl: profile?.photo_url || null,
      },
    });
  } catch (error) {
    console.error('댓글 수정 에러:', error);
    return errorResponse('댓글 수정에 실패했습니다.');
  }
}

/**
 * DELETE /api/activities/[id]/comments/[commentId]
 * 댓글 삭제
 *
 * 학습 포인트:
 * - RLS 정책으로 본인의 댓글만 삭제 가능
 * - CASCADE 설정으로 댓글 삭제 시 대댓글도 자동 삭제
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    // 댓글 삭제 (RLS로 본인 댓글만 삭제 가능)
    const { error } = await supabase
      .from('activity_comments')
      .delete()
      .eq('id', commentId)
      .eq('activity_id', id)
      .eq('user_id', user!.id);

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse({ message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    console.error('댓글 삭제 에러:', error);
    return errorResponse('댓글 삭제에 실패했습니다.');
  }
}
