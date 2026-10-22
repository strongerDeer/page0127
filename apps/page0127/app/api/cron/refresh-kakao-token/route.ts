import { refreshAndSave } from '@/shared/lib/kakao-alert/kakaoAlertSender';
import { getKakaoAlertConfig } from '@/shared/lib/kakao-alert/kakaoApi';
import { loadKakaoTokens, saveKakaoTokens } from '@/shared/lib/kakao-alert/tokenStore';

import { cronAuthResult } from '../../_helpers/cron-auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/cron/refresh-kakao-token
 * 카카오 알림 토큰을 매주 갱신한다.
 *
 * 왜 필요한가:
 *   리프레시 토큰은 약 60일 뒤 만료되고, 카카오는 **남은 기간이 1달 미만일 때 갱신하면**
 *   새 리프레시 토큰(다시 60일)을 준다. 에러가 두 달 동안 한 번도 안 나면 발송 때 갱신할
 *   기회가 없어 토큰이 죽고, 정작 다음 에러는 카톡으로 오지 않는다. 그래서 에러와 상관없이
 *   주 1회 갱신해 계속 연장한다.
 *
 * ⚠️ Vercel Cron은 GET으로 호출한다.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = cronAuthResult(request);
  if (!auth.ok) {
    return errorResponse(auth.message, auth.status);
  }

  try {
    const current = await loadKakaoTokens();
    if (!current) {
      // 아직 어드민에서 연결 전 — 고장이 아니다
      return successResponse({ refreshed: false, reason: 'not_connected' });
    }

    const next = await refreshAndSave(
      { config: getKakaoAlertConfig(), load: loadKakaoTokens, save: saveKakaoTokens },
      current
    );
    return successResponse({
      refreshed: true,
      refreshTokenExpiresAt: next.refreshTokenExpiresAt.toISOString(),
    });
  } catch (e) {
    console.error('GET /api/cron/refresh-kakao-token error:', e);
    return errorResponse('카카오 알림 토큰 갱신에 실패했습니다.', 500);
  }
}
