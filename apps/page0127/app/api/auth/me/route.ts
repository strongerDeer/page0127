import { NextRequest } from 'next/server';

import { getSupabaseClient } from '../../_helpers/auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/auth/me
 * 현재 로그인한 사용자 정보 조회
 *
 * 학습 포인트:
 * - 클라이언트에서 현재 사용자 확인
 * - 세션 기반 인증 확인
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return errorResponse('로그인이 필요합니다.', 401);
    }

    return successResponse({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    return errorResponse('사용자 정보 조회에 실패했습니다.');
  }
}
