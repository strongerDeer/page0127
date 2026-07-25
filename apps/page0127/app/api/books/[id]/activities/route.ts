import { NextRequest } from 'next/server';

import { getSupabaseClient } from '../../../_helpers/auth';
import { buildActivityItems } from '../../../_helpers/buildActivityItems';
import { errorResponse, notFoundResponse, successResponse } from '../../../_helpers/response';

/**
 * GET /api/books/[id]/activities?limit=20&offset=0
 * 그 책의 활동을 시간순(최신순)으로 조회한다.
 *
 * 공개범위:
 * - 공개 책: 비로그인 포함 누구나
 * - 비공개 책: 소유자만 (아니면 404)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const supabase = await getSupabaseClient();

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 로그인 여부는 선택 — 비로그인도 공개 책은 볼 수 있다
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 책 조회 + 공개범위 판정
    const { data: book } = await supabase
      .from('books')
      .select('id, user_id, is_public, title, author, cover_image, status, rating')
      .eq('id', bookId)
      .single();

    if (!book) return notFoundResponse('책');

    const isOwner = user?.id === book.user_id;
    if (!book.is_public && !isOwner) {
      return notFoundResponse('책');
    }

    // 그 책의 활동 (최신순, 페이지네이션)
    const { data: activities, error } = await supabase
      .from('activities')
      .select('id, user_id, activity_type, book_id, content, created_at')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return errorResponse(error.message);
    if (!activities || activities.length === 0) return successResponse([]);

    const userIds = [...new Set(activities.map((a) => a.user_id))];
    const activityIds = activities.map((a) => a.id);

    const [{ data: profiles }, { data: likes }] = await Promise.all([
      supabase.from('profiles').select('id, nickname, username, photo_url').in('id', userIds),
      supabase.from('activity_likes').select('activity_id, user_id').in('activity_id', activityIds),
    ]);

    const items = buildActivityItems({
      activities,
      profiles: profiles ?? [],
      books: [{ id: book.id, title: book.title, author: book.author, cover_image: book.cover_image, status: book.status, rating: book.rating }],
      likes: likes ?? [],
      currentUserId: user?.id ?? null,
    });

    return successResponse(items);
  } catch (error) {
    console.error('책 활동 조회 에러:', error);
    return errorResponse('책 활동 조회에 실패했습니다.');
  }
}
