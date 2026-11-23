import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
import {
  getFollowCountMap,
  pickFollowCounts,
} from '../../../_helpers/followCounts';
import { checkFollowListAccess } from '../../../_helpers/followListAccess';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from '../../../_helpers/response';

/**
 * GET /api/follows/:userId/following
 * 팔로잉 목록 조회 (해당 유저가 팔로우하는 사람들)
 *
 * 학습 포인트:
 * - followers와 반대 방향 JOIN
 * - following_id 기준으로 프로필 조회
 * - 권한: 본인만 (API 403 + follows RLS 두 겹)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await getSupabaseClient();
    const { userId } = await params;

    // 명단은 본인만 본다 — 숫자는 /stats 로 누구나 (_helpers/followListAccess.ts)
    const { user } = await getCurrentUser();
    const access = checkFollowListAccess(user?.id, userId);
    if (access === 'unauthorized') return unauthorizedResponse();
    if (access === 'forbidden') {
      return errorResponse('팔로잉 목록은 본인만 볼 수 있어요.', 403);
    }

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

    // 프로필·팔로워/팔로잉 수 일괄 조회 (숫자는 user_follow_stats 뷰)
    const [{ data: profiles }, countMap] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, nickname, username, bio, photo_url')
        .in('id', followingIds),
      getFollowCountMap(supabase, followingIds),
    ]);

    // 프로필 맵 생성
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // 결과 조합
    const followingWithInfo = following.map((follow) => {
      const profile = profileMap.get(follow.following_id);
      return {
        id: follow.following_id,
        nickname: profile?.nickname || null,
        // 표시 이름 대체 및 프로필 링크(/[username])에 필요
        username: profile?.username || null,
        bio: profile?.bio || null,
        photo_url: profile?.photo_url || null,
        ...pickFollowCounts(countMap, follow.following_id),
        is_following: false,
      };
    });

    return successResponse(followingWithInfo);
  } catch {
    return errorResponse('팔로잉 목록 조회에 실패했습니다.');
  }
}
