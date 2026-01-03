import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../_helpers/auth';
import { errorResponse, successResponse } from '../_helpers/response';

/**
 * POST /api/follows
 * 팔로우하기
 *
 * 학습 포인트:
 * - 인증된 사용자만 팔로우 가능
 * - Supabase RLS 정책으로 보안 보장
 * - UNIQUE 제약조건으로 중복 팔로우 방지
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const body = await request.json();
    const { following_id } = body;

    // 인증 확인
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    // 팔로우 추가
    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_id: user!.id,
        following_id,
      })
      .select()
      .single();

    if (error) {
      // 중복 팔로우 시도 또는 자기 자신 팔로우 시도
      if (error.code === '23505') {
        return errorResponse('이미 팔로우 중입니다.', 400);
      }
      if (error.code === '23514') {
        return errorResponse('자기 자신을 팔로우할 수 없습니다.', 400);
      }
      return errorResponse(error.message);
    }

    // 알림 생성 (팔로우 알림)
    await supabase.from('notifications').insert({
      user_id: following_id, // 팔로우 당한 사람
      type: 'follow',
      actor_id: user!.id, // 팔로우한 사람
    });

    return successResponse(data, 201);
  } catch {
    return errorResponse('팔로우에 실패했습니다.');
  }
}
