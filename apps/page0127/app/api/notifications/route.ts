import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../_helpers/auth';
import { errorResponse, successResponse } from '../_helpers/response';

/**
 * GET /api/notifications
 * 알림 목록 조회 (프로필 정보 포함)
 *
 * Query Parameters:
 * - limit: 조회 개수 (기본 20)
 * - offset: 건너뛸 개수 (기본 0)
 * - is_read: 읽음 여부 필터 (선택)
 *
 * 학습 포인트:
 * - JOIN으로 actor 프로필 정보 함께 가져오기
 * - 정렬: 최신순 (created_at DESC)
 * - RLS 정책으로 본인의 알림만 조회 가능
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();

    // 인증 확인
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    // Query Parameters 파싱
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const is_read = searchParams.get('is_read');

    // 알림 조회 쿼리 구성
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // is_read 필터 (선택적)
    if (is_read !== null) {
      query = query.eq('is_read', is_read === 'true');
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('알림 조회 에러:', error);
      return errorResponse(error.message);
    }

    // 알림이 없으면 빈 배열 반환
    if (!notifications || notifications.length === 0) {
      return successResponse([]);
    }

    // actor 프로필 정보 조회 (별도로)
    const actorIds = [...new Set(notifications.map((n) => n.actor_id))];
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, nickname, photo_url, username')
      .in('id', actorIds);

    if (profileError) {
      console.error('프로필 조회 에러:', profileError);
    }

    // 프로필 정보 매핑
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const notificationsWithActor = notifications.map((notification) => ({
      ...notification,
      actor: profileMap.get(notification.actor_id) || {
        id: notification.actor_id,
        nickname: '알 수 없음',
        photo_url: null,
        username: null,
      },
    }));

    return successResponse(notificationsWithActor);
  } catch {
    return errorResponse('알림 조회에 실패했습니다.');
  }
}

// POST /api/notifications 핸들러는 제거됨.
// 이 엔드포인트는 실제로 호출되는 곳이 없었고(죽은 코드), 로그인 사용자가 남에게
// 가짜 알림을 만들 수 있는 공격 표면만 열어 두고 있었다.
// 정상 알림은 팔로우/댓글/좋아요 서버 라우트가 이벤트 발생 시점에 직접 생성한다
// (그쪽에서 actor_id=인증 사용자, 수신자=실제 리소스 소유자로 안전하게 처리).
