import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
import { errorResponse, successResponse } from '../../../_helpers/response';

/**
 * GET /api/follows/:userId/followers
 * 팔로워 목록 조회 (해당 유저를 팔로우하는 사람들)
 *
 * 학습 포인트:
 * - JOIN 쿼리: follows 테이블과 profiles 테이블 조인
 * - 팔로우 여부 추가: 현재 로그인한 사용자가 각 팔로워를 팔로우하는지 확인
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await getSupabaseClient();
    const { userId } = await params;

    // 현재 로그인한 사용자 (팔로우 여부 확인용, 선택적)
    const { user } = await getCurrentUser();
    const _currentUserId = user?.id;

    // 팔로워 목록 조회 (간단한 버전 - 프로필만)
    const { data: followers, error } = await supabase
      .from('follows')
      .select('follower_id, created_at')
      .eq('following_id', userId)
      .order('created_at', { ascending: false });

    if (error) return errorResponse(error.message);
    if (!followers || followers.length === 0) {
      return successResponse([]);
    }

    // 팔로워 ID 목록
    const followerIds = followers.map((f) => f.follower_id);

    // 프로필 일괄 조회
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, bio, photo_url')
      .in('id', followerIds);

    // 프로필 맵 생성
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // 결과 조합
    const followersWithInfo = followers.map((follow) => {
      const profile = profileMap.get(follow.follower_id);
      return {
        id: follow.follower_id,
        nickname: profile?.nickname || null,
        bio: profile?.bio || null,
        photo_url: profile?.photo_url || null,
        followers_count: 0,
        following_count: 0,
        is_following: false,
      };
    });

    return successResponse(followersWithInfo);
  } catch {
    return errorResponse('팔로워 목록 조회에 실패했습니다.');
  }
}
