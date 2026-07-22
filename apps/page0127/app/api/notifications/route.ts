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

/**
 * POST /api/notifications
 * 알림 생성 (내부 API - 다른 API에서 호출)
 *
 * Request Body:
 * - user_id: 알림을 받을 사용자 ID
 * - type: 'follow' | 'comment' | 'like'
 * - target_id: 관련 리소스 ID (선택)
 * - target_type: 'activity' | 'comment' (선택)
 *
 * 학습 포인트:
 * - actor_id(알림을 발생시킨 사람)는 body로 받지 않고 인증된 본인으로 고정한다
 *   — DB의 RLS가 `WITH CHECK (true)`라 누구나 insert 가능해서, 로그인 검증과
 *   actor_id 위조 방지를 이 API 레이어에서 직접 해야 한다.
 * - 자기 자신에게는 알림 생성하지 않음
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const body = await request.json();
    const { user_id, type, target_id, target_type } = body;
    const actor_id = user!.id;

    // 자기 자신에게는 알림 보내지 않음
    if (user_id === actor_id) {
      return successResponse({ message: '자기 자신에게는 알림을 보내지 않습니다.' });
    }

    // 알림 생성
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        actor_id,
        target_id,
        target_type,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(error.message);
    }

    return successResponse(data, 201);
  } catch {
    return errorResponse('알림 생성에 실패했습니다.');
  }
}
