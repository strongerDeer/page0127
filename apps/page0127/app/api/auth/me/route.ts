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

    // 비로그인은 "요청 실패"가 아니라 "로그인 안 함"이라는 정상 답 → 200 + null.
    // 401로 답하면 브라우저가 콘솔에 `Failed to load resource`를 직접 찍는다.
    // 이 출력은 JS(try/catch·인터셉터)로 막을 수 없어서, 방문자마다 콘솔 에러가 1건씩 생긴다.
    // (로그인이 꼭 필요한 다른 API는 그대로 401 — 거기선 거절이 맞는 답이다)
    if (error || !user) {
      return successResponse(null);
    }

    return successResponse({
      id: user.id,
      email: user.email,
    });
  } catch {
    return errorResponse('사용자 정보 조회에 실패했습니다.');
  }
}
