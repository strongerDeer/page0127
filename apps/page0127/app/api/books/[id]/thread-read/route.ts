import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '@/app/api/_helpers/auth';
import { errorResponse, successResponse } from '@/app/api/_helpers/response';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/books/[id]/thread-read
 * 이 책 스레드를 지금 읽었다고 기록한다 (새 댓글 배지의 기준선)
 *
 * 학습 포인트:
 * - upsert: 행이 없으면 넣고 있으면 갱신한다. PK(user_id, book_id)가 충돌 기준이다.
 * - 미로그인은 조용히 200으로 넘긴다. 배지는 로그인 사용자에게만 의미가 있고,
 *   읽기만 하러 온 사람에게 401 을 띄울 이유가 없다.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    if (!user) return successResponse({ message: '기록하지 않았습니다.' });

    const { error } = await supabase.from('book_thread_reads').upsert(
      {
        book_id: id,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,book_id' }
    );

    if (error) return errorResponse(error.message);

    return successResponse({ message: '열람 시각을 기록했습니다.' });
  } catch (error) {
    console.error('스레드 열람 기록 예외:', error);
    return errorResponse('열람 기록에 실패했습니다.');
  }
}
