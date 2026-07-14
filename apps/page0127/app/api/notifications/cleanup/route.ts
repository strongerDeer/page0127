import { createClient } from '@/shared/config/supabase/server';

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
    // Vercel Cron Secret 검증 (환경변수 미설정 시 건너뜀 — 로컬 개발용)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${cronSecret}`) {
        return errorResponse('Unauthorized', 401);
      }
    }

    const supabase = await createClient();

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

// 수동 호출용 (기존 동작 유지)
export const POST = cleanupNotifications;
