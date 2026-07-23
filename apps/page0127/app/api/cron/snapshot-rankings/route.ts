import { createAdminClient } from '@/shared/config/supabase/admin';

import { cronAuthResult } from '../../_helpers/cron-auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/cron/snapshot-rankings
 * 오늘의 도서 랭킹을 스냅샷 테이블에 기록한다. (하루 1회)
 *
 * ⚠️ 반드시 GET 이어야 한다.
 *    Vercel 공식 문서: "Vercel makes an HTTP GET request to your project's
 *    production deployment URL". POST만 export하면 cron이 405로 실패한다.
 *
 * 왜 필요한가:
 *   교보문고의 "▲448 급상승"은 **어제의 랭킹이 DB에 있어야만** 계산된다.
 *   이 cron이 매일 돌아야 순위 변동이 화면에 뜬다. (00_docs/07 §6)
 *
 * 왜 service_role 인가:
 *   snapshot_book_rankings 함수의 EXECUTE 권한을 service_role 에만 줬다.
 *   랭킹 스냅샷은 사용자가 쓸 수 있으면 안 되는 데이터다.
 *
 * 재실행 안전: 같은 날 여러 번 호출해도 UPSERT라 결과가 같다.
 */
export const dynamic = 'force-dynamic';

type SnapshotRow = {
  snapshot_rank_type: string;
  rows_written: number;
};

export async function GET(request: Request) {
  try {
    // 크론 인증 — 시크릿 미설정 시 운영에서는 차단(fail-closed), 개발만 통과.
    const auth = cronAuthResult(request);
    if (!auth.ok) {
      return errorResponse(auth.message, auth.status);
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('snapshot_book_rankings');

    if (error) {
      console.error('랭킹 스냅샷 실패:', error);
      return errorResponse(`랭킹 스냅샷에 실패했습니다: ${error.message}`, 500);
    }

    const rows = (data as SnapshotRow[] | null) ?? [];
    const written = rows.reduce((sum, r) => sum + Number(r.rows_written), 0);

    return successResponse({
      message: `랭킹 스냅샷 완료 — ${written}행 기록`,
      snapshotDate: new Date().toISOString().slice(0, 10),
      detail: rows,
    });
  } catch (e) {
    console.error('GET /api/cron/snapshot-rankings error:', e);
    return errorResponse('랭킹 스냅샷 중 오류가 발생했습니다.', 500);
  }
}
