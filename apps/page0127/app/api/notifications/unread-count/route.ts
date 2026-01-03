import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/notifications/unread-count
 * 읽지 않은 알림 개수 조회
 *
 * 학습 포인트:
 * - count() 함수로 효율적인 개수 조회
 * - RLS 정책으로 본인의 알림만 집계
 */
export async function GET() {
  try {
    const supabase = await getSupabaseClient();

    // 인증 확인
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    // 읽지 않은 알림 개수 조회
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('is_read', false);

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse({ count: count || 0 });
  } catch {
    return errorResponse('읽지 않은 알림 개수 조회에 실패했습니다.');
  }
}
