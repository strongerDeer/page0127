import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/activities/[id]
 * 특정 활동 상세 조회
 *
 * 학습 포인트:
 * - 활동 정보 + 사용자 + 책 + 좋아요 정보 모두 조회
 * - 댓글은 별도 API로 조회 (이미 구현됨)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    // 활동 정보 조회
    const { data: activity, error } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('활동 조회 에러:', error);
      return errorResponse(error.message, 404);
    }

    if (!activity) {
      return errorResponse('활동을 찾을 수 없습니다.', 404);
    }

    // 사용자 프로필 정보 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nickname, photo_url')
      .eq('id', activity.user_id)
      .single();

    // 책 정보 조회
    const { data: book } = await supabase
      .from('books')
      .select('id, title, author, cover_image, status, rating')
      .eq('id', activity.book_id)
      .single();

    // 좋아요 정보 조회
    const { data: likes } = await supabase
      .from('activity_likes')
      .select('user_id')
      .eq('activity_id', id);

    const likeInfo = {
      count: likes?.length || 0,
      isLiked: user ? likes?.some((like) => like.user_id === user.id) : false,
    };

    // 결과 조합
    const result = {
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
      likes: likeInfo,
    };

    return successResponse(result);
  } catch (error) {
    console.error('활동 상세 조회 에러:', error);
    return errorResponse('활동 조회에 실패했습니다.');
  }
}
