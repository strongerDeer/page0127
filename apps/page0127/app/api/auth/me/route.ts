import { NextRequest } from 'next/server';

import { getVerifiedUser } from '@/shared/lib/auth/getVerifiedUser';

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
    const user = await getVerifiedUser(supabase.auth);

    // 비로그인은 "요청 실패"가 아니라 "로그인 안 함"이라는 정상 답 → 200 + null.
    // 401로 답하면 브라우저가 콘솔에 `Failed to load resource`를 직접 찍는다.
    // 이 출력은 JS(try/catch·인터셉터)로 막을 수 없어서, 방문자마다 콘솔 에러가 1건씩 생긴다.
    // (로그인이 꼭 필요한 다른 API는 그대로 401 — 거기선 거절이 맞는 답이다)
    const response = successResponse(
      user ? { id: user.id, email: user.email } : null
    );
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch {
    const response = errorResponse(
      '로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
      503
    );
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Retry-After', '3');
    return response;
  }
}
