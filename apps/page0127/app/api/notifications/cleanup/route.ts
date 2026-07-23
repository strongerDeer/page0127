import { createAdminClient } from '@/shared/config/supabase/admin';

import { cronAuthResult } from '../../_helpers/cron-auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * /api/notifications/cleanup
 * 30일 이상 지난 '읽은' 알림 자동 삭제
 *
 * ⚠️ GET 이 있어야 한다 (2026-07-13 수정)
 *    Vercel 공식 문서: "Vercel makes an HTTP GET request to your project's
 *    production deployment URL."
 *    이 라우트는 POST만 export하고 있어서 매일 새벽 2시 cron이 405로 실패했고,
 *    알림이 한 번도 정리되지 않고 있었다.
 *    → GET(cron용) + POST(수동 호출용) 둘 다 같은 핸들러로 연결한다.
 *
 * 학습 포인트:
 * - Vercel Cron Job으로 주기적 실행
 * - Authorization 헤더로 cron 호출 검증
 */
const cleanupNotifications = async (request: Request) => {
  try {
    // 크론 인증 — 시크릿 미설정 시 운영에서는 차단(fail-closed), 개발만 통과.
    const auth = cronAuthResult(request);
    if (!auth.ok) {
      return errorResponse(auth.message, auth.status);
    }

    // 익명 크론 요청은 세션이 없어 RLS에 막혀 다른 사용자의 알림을 못 지운다.
    // service_role(admin)로 RLS를 넘어 전체 사용자의 오래된 읽은 알림을 정리한다.
    const supabase = createAdminClient();

    // 30일 이전 날짜 계산
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 30일 이상 지난 읽은 알림 삭제
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('is_read', true)
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('id');

    if (error) {
      console.error('Notification cleanup error:', error);
      return errorResponse('Failed to cleanup notifications', 500);
    }

    const deletedCount = data?.length || 0;

    return successResponse({
      message: `${deletedCount} notifications cleaned up`,
      deletedCount,
      cleanupDate: thirtyDaysAgo.toISOString(),
    });
  } catch (error) {
    console.error('/api/notifications/cleanup error:', error);
    return errorResponse('Internal server error', 500);
  }
};

// Vercel Cron 이 호출하는 메서드
export const GET = cleanupNotifications;

// 수동 호출용 — 이제 GET과 동일하게 cron 시크릿이 필요하다(관리자/크론 전용).
export const POST = cleanupNotifications;
