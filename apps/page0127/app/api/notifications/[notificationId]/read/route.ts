import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
import { errorResponse, successResponse } from '../../../_helpers/response';

/**
 * PATCH /api/notifications/[notificationId]/read
 * 개별 알림 읽음 처리
 *
 * 학습 포인트:
 * - RLS 정책으로 본인의 알림만 수정 가능
 * - updated_at은 트리거로 자동 업데이트
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const supabase = await getSupabaseClient();
    const { notificationId } = await params;

    // 인증 확인
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    // 알림 읽음 처리
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user!.id) // RLS 추가 검증
      .select()
      .single();

    if (error) {
      return errorResponse(error.message);
    }

    if (!data) {
      return errorResponse('알림을 찾을 수 없습니다.', 404);
    }

    return successResponse(data);
  } catch {
    return errorResponse('알림 읽음 처리에 실패했습니다.');
  }
}
