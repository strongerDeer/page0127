import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../_helpers/auth';
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

    if (!followingList || followingList.length === 0) {
      return successResponse([]);
    }

    const followingIds = followingList.map((f) => f.following_id);

    // 팔로잉한 사용자들의 활동 조회
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
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return errorResponse(error.message);

    if (!activities || activities.length === 0) {
      return successResponse([]);
    }

    // 활동과 관련된 사용자 정보 조회
    const userIds = [...new Set(activities.map((a) => a.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, photo_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // 활동과 관련된 책 정보 조회
    const bookIds = [...new Set(activities.map((a) => a.book_id))];
    console.log('조회할 책 IDs:', bookIds);

    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title, author, cover_image, status, rating')
      .in('id', bookIds);

    console.log('책 조회 결과:', books);
    console.log('책 조회 에러:', booksError);

    const bookMap = new Map(books?.map((b) => [b.id, b]) || []);

    // 결과 조합
    const feed = activities.map((activity) => {
      const profile = profileMap.get(activity.user_id);
      const book = bookMap.get(activity.book_id);

      return {
        id: activity.id,
        activity_type: activity.activity_type,
        content: activity.content,
        created_at: activity.created_at,
        user: {
          id: activity.user_id,
          nickname: profile?.nickname || null,
          photo_url: profile?.photo_url || null,
        },
        book: book
          ? {
              id: book.id,
              title: book.title,
              author: book.author,
              cover_image: book.cover_image,
              status: book.status,
              rating: book.rating,
            }
          : null,
      };
    });

    return successResponse(feed);
  } catch (error) {
    console.error('피드 조회 에러:', error);
    return errorResponse('피드 조회에 실패했습니다.');
  }
}
