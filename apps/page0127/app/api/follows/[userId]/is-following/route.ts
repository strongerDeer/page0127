import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
import { errorResponse, successResponse } from '../../../_helpers/response';

/**
 * GET /api/follows/:userId/is-following
 * 팔로우 여부 확인 (현재 로그인한 사용자가 특정 유저를 팔로우하는지)
 *
 * 학습 포인트:
 * - 인증 필수 (본인의 팔로우 여부 확인)
 * - 버튼 UI 상태 관리용 엔드포인트
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await getSupabaseClient();
    const { userId } = await params;

    // 인증 확인
    const { user, error: authError } = await getCurrentUser();
    if (authError) {
      // 로그인하지 않은 경우 false 반환
      return successResponse({ is_following: false });
    }

    // 자기 자신인 경우 false
    if (user!.id === userId) {
      return successResponse({ is_following: false });
    }

    // 팔로우 여부 확인
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user!.id)
      .eq('following_id', userId)
      .maybeSingle();

    if (error) return errorResponse(error.message);

    return successResponse({ is_following: !!data });
  } catch {
    return errorResponse('팔로우 여부 확인에 실패했습니다.');
  }
}
