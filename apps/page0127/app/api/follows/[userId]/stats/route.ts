import { NextRequest } from 'next/server';

import { getSupabaseClient } from '../../../_helpers/auth';
import { errorResponse, successResponse } from '../../../_helpers/response';

/**
 * GET /api/follows/:userId/stats
 * 팔로우 통계 조회
 *
 * 학습 포인트:
 * - user_follow_stats 뷰 활용 (성능 최적화)
 * - 인증 불필요 (공개 정보)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await getSupabaseClient();
    const { userId } = await params;

    // 통계 뷰에서 조회
    const { data, error } = await supabase
      .from('user_follow_stats')
      .select('followers_count, following_count')
      .eq('user_id', userId)
      .single();

    if (error) {
      // 사용자가 없는 경우 0으로 반환
      return successResponse({
        followers_count: 0,
        following_count: 0,
      });
    }

    return successResponse(data);
  } catch {
    return errorResponse('통계 조회에 실패했습니다.');
  }
}
