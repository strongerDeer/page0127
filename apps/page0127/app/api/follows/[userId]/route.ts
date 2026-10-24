import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import { errorResponse, successResponse } from '../../_helpers/response';
import { retractUnreadNotifications } from '../../_helpers/retractNotification';

/**
 * DELETE /api/follows/:userId
 * 언팔로우하기
 *
 * 학습 포인트:
 * - Dynamic Route: [userId]로 URL 파라미터 처리
 * - params는 Promise로 래핑되어 있음 (Next.js 15+)
 * - 언팔로우 시 읽지 않은 팔로우 알림 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await getSupabaseClient();
    const { userId } = await params;

    // 인증 확인
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    // 언팔로우
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user!.id)
      .eq('following_id', userId);

    if (error) return errorResponse(error.message);

    // 상대가 아직 안 읽은 팔로우 알림은 거둔다
    await retractUnreadNotifications(supabase, {
      actorId: user!.id,
      type: 'follow',
      userId,
    });

    return successResponse({ message: '언팔로우했습니다.' });
  } catch {
    return errorResponse('언팔로우에 실패했습니다.');
  }
}
