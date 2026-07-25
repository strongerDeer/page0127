import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../_helpers/auth';
import { buildActivityItems } from '../_helpers/buildActivityItems';
import { errorResponse, successResponse } from '../_helpers/response';

/**
 * GET /api/feed?limit=20&offset=0
 * 팔로잉한 사용자들의 활동 피드 조회
 *
 * 학습 포인트:
 * - 페이지네이션 (limit, offset)
 * - JOIN 쿼리로 여러 테이블 데이터 조합
 * - 시간순 정렬 (최신순)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 팔로잉한 사용자 목록 조회
    const { data: followingList } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user!.id);

    // 팔로잉한 사용자 ID + 본인 ID 포함
    const followingIds = followingList?.map((f) => f.following_id) || [];
    const userIdsToShow = [...followingIds, user!.id]; // 본인 활동도 포함

    // 팔로잉한 사용자들 + 본인의 활동 조회
    const { data: activities, error } = await supabase
      .from('activities')
      .select(
        `
        id,
        user_id,
        activity_type,
        book_id,
        content,
        created_at
      `
      )
      .in('user_id', userIdsToShow)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return errorResponse(error.message);

    if (!activities || activities.length === 0) {
      return successResponse([]);
    }

    // 활동과 관련된 프로필/책/좋아요 조회 (배치)
    const userIds = [...new Set(activities.map((a) => a.user_id))];
    const bookIds = [...new Set(activities.map((a) => a.book_id))];
    const activityIds = activities.map((a) => a.id);

    const [{ data: profiles }, { data: books }, { data: likes }] = await Promise.all([
      supabase.from('profiles').select('id, nickname, photo_url').in('id', userIds),
      supabase.from('books').select('id, title, author, cover_image, status, rating').in('id', bookIds),
      supabase.from('activity_likes').select('activity_id, user_id').in('activity_id', activityIds),
    ]);

    const feed = buildActivityItems({
      activities,
      profiles: profiles ?? [],
      books: books ?? [],
      likes: likes ?? [],
      currentUserId: user!.id,
    });

    return successResponse(feed);
  } catch (error) {
    console.error('피드 조회 에러:', error);
    return errorResponse('피드 조회에 실패했습니다.');
  }
}
