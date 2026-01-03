import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * DELETE /api/notifications/[notificationId]
 * 알림 삭제
 *
 * 학습 포인트:
 * - RLS 정책으로 본인의 알림만 삭제 가능
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const supabase = await getSupabaseClient();
    const { notificationId } = await params;

    // 인증 확인
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    // 알림 삭제
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user!.id); // RLS 추가 검증

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse({ success: true });
  } catch {
    return errorResponse('알림 삭제에 실패했습니다.');
  }
}
