import { createAdminClient } from '@/shared/config/supabase/admin';

import { cronAuthResult } from '../../_helpers/cron-auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/cron/cleanup-rate-limits
 * 1시간 지난 레이트리밋 카운터 행을 정리한다. (매시각)
 *
 * 왜 필요한가:
 *   예전엔 increment_rate_limit 함수 안에서 확률적으로(random()<0.001) 지웠지만,
 *   RPC를 service_role 전용으로 닫으면서 정리도 함수 밖 정기 cron으로 분리했다.
 *   (docs/superpowers/specs 없이 소규모 보안 수정)
 *
 * ⚠️ Vercel Cron은 GET으로 호출한다.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 크론 인증 — 시크릿 미설정 시 운영에서는 차단(fail-closed), 개발만 통과.
    const auth = cronAuthResult(request);
    if (!auth.ok) {
      return errorResponse(auth.message, auth.status);
    }

    // RLS가 켜진 rate_limits 테이블은 service_role로만 접근·삭제할 수 있다.
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await admin
      .from('rate_limits')
      .delete()
      .lt('window_start', cutoff)
      .select('identifier');

    if (error) {
      console.error('레이트리밋 정리 실패:', error);
      return errorResponse('레이트리밋 정리에 실패했습니다.', 500);
    }

    return successResponse({
      message: `레이트리밋 ${data?.length ?? 0}행 정리`,
      deletedCount: data?.length ?? 0,
    });
  } catch (e) {
    console.error('GET /api/cron/cleanup-rate-limits error:', e);
    return errorResponse('레이트리밋 정리 중 오류가 발생했습니다.', 500);
  }
}
