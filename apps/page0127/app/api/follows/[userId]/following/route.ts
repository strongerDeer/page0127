import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
import { errorResponse, successResponse } from '../../../_helpers/response';

/**
 * GET /api/follows/:userId/following
 * 팔로잉 목록 조회 (해당 유저가 팔로우하는 사람들)
 *
 * 학습 포인트:
 * - followers와 반대 방향 JOIN
 * - following_id 기준으로 프로필 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await getSupabaseClient();
    const { userId } = await params;

    // 현재 로그인한 사용자
    const { user } = await getCurrentUser();
    const _currentUserId = user?.id;

    // 팔로잉 목록 조회 (간단한 버전 - 프로필만)
    const { data: following, error } = await supabase
      .from('follows')
      .select('following_id, created_at')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    if (error) return errorResponse(error.message);
    if (!following || following.length === 0) {
      return successResponse([]);
    }

    // 팔로잉 ID 목록
    const followingIds = following.map((f) => f.following_id);

    // 프로필 일괄 조회
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, bio, photo_url')
      .in('id', followingIds);

    // 프로필 맵 생성
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // 결과 조합
    const followingWithInfo = following.map((follow) => {
      const profile = profileMap.get(follow.following_id);
      return {
        id: follow.following_id,
        nickname: profile?.nickname || null,
        bio: profile?.bio || null,
        photo_url: profile?.photo_url || null,
        followers_count: 0,
        following_count: 0,
        is_following: false,
      };
    });

    return successResponse(followingWithInfo);
  } catch {
    return errorResponse('팔로잉 목록 조회에 실패했습니다.');
  }
}
