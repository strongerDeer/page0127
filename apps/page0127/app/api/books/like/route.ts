import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '@/app/api/_helpers/auth';
import { errorResponse, successResponse } from '@/app/api/_helpers/response';

/**
 * POST /api/books/like
 * 토글 방식으로 좋아요 추가/삭제
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const { user, error: authError } = await getCurrentUser();

    if (authError || !user) {
      return errorResponse('로그인이 필요합니다.', 401);
    }

    const body = await request.json();
    const { bookId } = body; // global_books id

    if (!bookId) {
      return errorResponse('Book ID is required', 400);
    }

    // Check if already liked
    const { data: existingLike, error: fetchError } = await supabase
      .from('book_likes')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: no rows found
       return errorResponse(fetchError.message);
    }

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('book_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', bookId);

      if (deleteError) return errorResponse(deleteError.message);
      return successResponse({ liked: false });
    } else {
      // Like
      const { error: insertError } = await supabase
        .from('book_likes')
        .insert({
          user_id: user.id,
          book_id: bookId,
        });

      if (insertError) return errorResponse(insertError.message);
      return successResponse({ liked: true });
    }
  } catch (e) {
    console.error('Like API Error:', e);
    return errorResponse(e instanceof Error ? e.message : 'Internal Server Error', 500);
  }
}
