import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * PATCH /api/notifications/read-all
 * 전체 알림 읽음 처리
 *
 * 학습 포인트:
 * - 조건에 맞는 모든 행 업데이트
 * - RLS 정책으로 본인의 알림만 수정
 */
export async function PATCH() {
  try {
    const supabase = await getSupabaseClient();

    // 인증 확인
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    // 모든 읽지 않은 알림 읽음 처리
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user!.id)
      .eq('is_read', false);

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse('전체 읽음 처리에 실패했습니다.');
  }
}
