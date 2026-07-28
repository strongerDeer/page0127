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

    // 팔로잉한 사용자들 + 본인의 활동 — 책마다 최신 1건만(뷰가 DISTINCT ON 처리)
    const { data: activities, error } = await supabase
      .from('book_latest_activities')
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

    // 화면에 뜬 책들에 대해서만 배치 조회한다.
    // 중복 제거로 최신 활동 1건만 남았으므로, 접힌 맥락(이벤트 요약)은 따로 받아온다.
    const userIds = [...new Set(activities.map((a) => a.user_id))];
    const bookIds = [...new Set(activities.map((a) => a.book_id))];

    const [
      { data: profiles },
      { data: books },
      { data: likes },
      { data: comments },
      { data: threadReads },
      { data: bookEvents },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, nickname, username, photo_url')
        .in('id', userIds),
      supabase
        .from('books')
        .select(
          'id, title, author, cover_image, status, rating, is_life_book, one_line_review'
        )
        .in('id', bookIds),
      supabase
        .from('book_record_likes')
        .select('book_id, user_id')
        .in('book_id', bookIds),
      // 본문은 필요 없다 — 개수와 배지 계산에 쓰는 세 컬럼만 받는다
      supabase
        .from('book_comments')
        .select('book_id, user_id, created_at')
        .in('book_id', bookIds),
      // 열람 시각은 내 것만 본다(RLS 도 본인 행만 허용한다)
      supabase
        .from('book_thread_reads')
        .select('book_id, last_read_at')
        .eq('user_id', user!.id)
        .in('book_id', bookIds),
      supabase
        .from('activities')
        .select('book_id, activity_type, created_at')
        .in('book_id', bookIds),
    ]);

    const feed = buildActivityItems({
      activities,
      profiles: profiles ?? [],
      books: books ?? [],
      likes: likes ?? [],
      comments: comments ?? [],
      threadReads: threadReads ?? [],
      bookEvents: bookEvents ?? [],
      currentUserId: user!.id,
    });

    return successResponse(feed);
  } catch (error) {
    console.error('피드 조회 에러:', error);
    return errorResponse('피드 조회에 실패했습니다.');
  }
}
