import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
import { errorResponse, successResponse } from '../../../_helpers/response';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/activities/[id]/comments
 * 특정 활동의 댓글 목록 조회
 *
 * 학습 포인트:
 * - 댓글과 대댓글을 계층 구조로 조회
 * - parent_comment_id로 댓글/대댓글 구분
 * - 프로필 정보와 함께 조회 (작성자 정보)
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;

    // 댓글 목록 조회 (프로필 정보 포함)
    const { data: comments, error } = await supabase
      .from('activity_comments')
      .select('id, user_id, parent_comment_id, content, created_at, updated_at')
      .eq('activity_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return errorResponse(error.message);
    }

    if (!comments || comments.length === 0) {
      return successResponse([]);
    }

    // 작성자 프로필 정보 조회
    const userIds = [...new Set(comments.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, photo_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // 댓글과 프로필 정보 매핑
    const commentsWithProfiles = comments.map((comment) => {
      const profile = profileMap.get(comment.user_id);
      return {
        id: comment.id,
        activityId: id,
        userId: comment.user_id,
        parentCommentId: comment.parent_comment_id,
        content: comment.content,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        user: {
          id: comment.user_id,
          nickname: profile?.nickname || null,
          photoUrl: profile?.photo_url || null,
        },
      };
    });

    // 댓글과 대댓글 분리 및 계층 구조 생성
    const commentMap = new Map(commentsWithProfiles.map((c) => [c.id, c]));
    const rootComments = commentsWithProfiles.filter(
      (c) => !c.parentCommentId
    );

    // 각 댓글에 대댓글 추가
    const result = rootComments.map((comment) => ({
      ...comment,
      replies: commentsWithProfiles.filter(
        (c) => c.parentCommentId === comment.id
      ),
    }));

    return successResponse(result);
  } catch (error) {
    console.error('댓글 조회 에러:', error);
    return errorResponse('댓글 조회에 실패했습니다.');
  }
}

/**
 * POST /api/activities/[id]/comments
 * 댓글 작성
 *
 * 학습 포인트:
 * - parent_comment_id로 일반 댓글과 대댓글 구분
 * - RLS 정책으로 로그인한 사용자만 작성 가능
 * - 트리거로 1depth 제한 자동 검증
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const body = await request.json();
    const { content, parentCommentId } = body;

    if (!content || content.trim().length === 0) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }

    // 댓글 작성
    const { data: comment, error } = await supabase
      .from('activity_comments')
      .insert({
        activity_id: id,
        user_id: user!.id,
        parent_comment_id: parentCommentId || null,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      // 대댓글 깊이 제한 에러
      if (error.message.includes('1depth')) {
        return errorResponse('대댓글의 대댓글은 작성할 수 없습니다.', 400);
      }
      return errorResponse(error.message);
    }

    // 작성자 프로필 정보 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, photo_url')
      .eq('id', user!.id)
      .single();

    return successResponse(
      {
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
      },
      201
    );
  } catch (error) {
    console.error('댓글 작성 에러:', error);
    return errorResponse('댓글 작성에 실패했습니다.');
  }
}
