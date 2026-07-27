import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '@/app/api/_helpers/auth';
import { errorResponse, successResponse } from '@/app/api/_helpers/response';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/books/[id]/likes
 * 개인 서재 책에 좋아요 추가
 *
 * 학습 포인트:
 * - 좋아요 대상이 활동에서 책으로 옮겨졌다. 한 책이 카드 1장이므로 숫자 기준도 책이다.
 * - PK(user_id, book_id)가 중복을 막는다 → 23505 를 409로 돌려준다.
 * - 권한 판단을 앱에서 하지 않는다. RLS가 "볼 수 있는 책"만 허용하므로,
 *   비공개인 남의 책에 좋아요를 시도하면 정책 위반으로 걸린다.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    if (!user) return errorResponse('로그인이 필요합니다.', 401);

    const { error } = await supabase
      .from('book_record_likes')
      .insert({ book_id: id, user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        return errorResponse('이미 좋아요를 누르셨습니다.', 409);
      }
      if (
        error.code === '42501' ||
        error.message.includes('row-level security')
      ) {
        return errorResponse('권한이 없습니다.', 403);
      }
      return errorResponse(error.message);
    }

    // 책 주인에게 알림 — 내 책이면 보내지 않는다
    const { data: book } = await supabase
      .from('books')
      .select('user_id')
      .eq('id', id)
      .single();

    if (book && book.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: book.user_id,
        type: 'like',
        actor_id: user.id,
        target_id: id,
        target_type: 'book', // 계획 1에서 알림 라우팅에 추가한 값
      });
    }

    return successResponse({ message: '좋아요를 추가했습니다.' }, 201);
  } catch (error) {
    console.error('책 좋아요 추가 예외:', error);
    return errorResponse('좋아요 추가에 실패했습니다.');
  }
}

/**
 * DELETE /api/books/[id]/likes
 * 좋아요 취소 — 없는 좋아요를 지워도 성공으로 둔다(멱등)
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    if (!user) return errorResponse('로그인이 필요합니다.', 401);

    const { error } = await supabase
      .from('book_record_likes')
      .delete()
      .eq('book_id', id)
      .eq('user_id', user.id);

    if (error) return errorResponse(error.message);

    return successResponse({ message: '좋아요를 취소했습니다.' });
  } catch (error) {
    console.error('책 좋아요 취소 예외:', error);
    return errorResponse('좋아요 취소에 실패했습니다.');
  }
}
