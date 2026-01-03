import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '@/app/api/_helpers/auth';
import {
  errorResponse,
  successResponse,
} from '@/app/api/_helpers/response';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/activities/[id]/likes
 * 특정 활동의 좋아요 목록 조회
 *
 * 학습 포인트:
 * - 좋아요 수와 현재 사용자의 좋아요 여부를 함께 반환
 * - profiles 조인으로 좋아요한 사용자 정보 포함
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    // 좋아요 목록 조회
    const { data: likes, error } = await supabase
      .from('activity_likes')
      .select('id, user_id, created_at')
      .eq('activity_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('좋아요 조회 에러:', error);
      return errorResponse(error.message);
    }

    // 좋아요한 사용자들의 프로필 정보 조회
    const userIds = [...new Set(likes?.map((like) => like.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, photo_url')
      .in('id', userIds);

    // 프로필 정보 매핑
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    const likesWithProfiles = likes?.map((like) => ({
      ...like,
      profiles: profileMap.get(like.user_id) || null,
    }));

    // 현재 사용자의 좋아요 여부 확인
    const isLiked = user
      ? likes?.some((like) => like.user_id === user.id)
      : false;

    return successResponse({
      likes: likesWithProfiles,
      count: likes?.length || 0,
      isLiked,
    });
  } catch {
    return errorResponse('좋아요 목록 조회에 실패했습니다.');
  }
}

/**
 * POST /api/activities/[id]/likes
 * 활동에 좋아요 추가
 *
 * 학습 포인트:
 * - UNIQUE 제약 조건으로 중복 좋아요 방지
 * - 에러 코드로 중복 여부 판단 (23505 = unique_violation)
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    if (!user) {
      return errorResponse('로그인이 필요합니다.', 401);
    }

    // 좋아요 추가
    const { error } = await supabase.from('activity_likes').insert({
      activity_id: id,
      user_id: user.id,
    });

    // 중복 좋아요 에러 처리
    if (error) {
      if (error.code === '23505') {
        return errorResponse('이미 좋아요를 누르셨습니다.', 409);
      }
      return errorResponse(error.message);
    }

    // 알림 생성 (좋아요 알림)
    // 활동 작성자에게 알림 보내기
    const { data: activity } = await supabase
      .from('activities')
      .select('user_id')
      .eq('id', id)
      .single();

    if (activity && activity.user_id !== user.id) {
      // 자기 자신의 활동에 좋아요 한 경우 제외
      await supabase.from('notifications').insert({
        user_id: activity.user_id,
        type: 'like',
        actor_id: user.id,
        target_id: id,
        target_type: 'activity',
      });
    }

    return successResponse({ message: '좋아요를 추가했습니다.' }, 201);
  } catch (error) {
    console.error('좋아요 추가 예외:', error);
    return errorResponse('좋아요 추가에 실패했습니다.');
  }
}

/**
 * DELETE /api/activities/[id]/likes
 * 활동의 좋아요 취소
 *
 * 학습 포인트:
 * - RLS 정책으로 본인의 좋아요만 삭제 가능
 * - 좋아요 취소 시 읽지 않은 알림 삭제
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    if (!user) {
      return errorResponse('로그인이 필요합니다.', 401);
    }

    // 좋아요 삭제
    const { error } = await supabase
      .from('activity_likes')
      .delete()
      .eq('activity_id', id)
      .eq('user_id', user.id);

    if (error) {
      return errorResponse(error.message);
    }

    // 읽지 않은 좋아요 알림 삭제
    await supabase
      .from('notifications')
      .delete()
      .eq('type', 'like')
      .eq('actor_id', user.id)
      .eq('target_id', id)
      .eq('is_read', false);

    return successResponse({ message: '좋아요를 취소했습니다.' });
  } catch (error) {
    console.error('좋아요 취소 예외:', error);
    return errorResponse('좋아요 취소에 실패했습니다.');
  }
}
