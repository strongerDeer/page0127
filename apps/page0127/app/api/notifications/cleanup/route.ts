import { createClient } from '@/shared/lib/supabase/server';
import { errorResponse, successResponse } from '@/shared/lib/api-response';

/**
 * POST /api/notifications/cleanup
 * 30일 이상 읽은 알림 자동 삭제
 *
 * 학습 포인트:
 * - Vercel Cron Job으로 주기적 실행
 * - 읽은 알림 중 30일 이상 지난 알림만 삭제
 * - Authorization 헤더로 cron 호출 검증 (선택사항)
 */
export async function POST(request: Request) {
  try {
    // Vercel Cron Secret 검증 (환경변수 설정 필요)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
    console.error('POST /api/notifications/cleanup error:', error);
    return errorResponse('Internal server error', 500);
  }
}
