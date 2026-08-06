import { NextRequest } from 'next/server';

import { isNewlyCompleted } from '@/entities/book/model/completion';

import { createActivity } from '../../_helpers/activity';
import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import {
  errorResponse,
  notFoundResponse,
  successResponse,
} from '../../_helpers/response';
import { syncLifeBookAcrossReadings } from '../../_helpers/syncLifeBookAcrossReadings';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/books/:id
 * 특정 책 상세 조회
 *
 * 비공개 책은 소유자만 조회 가능 — 방문자에게 개인 메모 등이 새어나가지 않도록 한다.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return notFoundResponse('책');

    if (!data.is_public && data.user_id !== user?.id) {
      return notFoundResponse('책');
    }

    return successResponse(data);
  } catch {
    return errorResponse('책 조회에 실패했습니다.');
  }
}

/**
 * PATCH /api/books/:id
 * 책 정보 수정 — 본인 소유 책만 수정할 수 있다.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { data: oldBook } = await supabase
      .from('books')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const { data, error } = await supabase
      .from('books')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return notFoundResponse('책');

    // 인생책은 '회독'이 아니라 '책'을 꼽은 것이다 → 같은 책의 다른 회독에도 반영한다.
    // 안 맞추면 책장(회독을 합쳐 인생책으로 표시)과 상세(행 그대로)가 어긋난다.
    if (typeof body.is_life_book === 'boolean') {
      await syncLifeBookAcrossReadings({
        supabase,
        userId: user.id,
        isbn: data.isbn,
        isLifeBook: body.is_life_book,
        exceptBookId: id,
      });
    }

    // status가 completed로 변경된 경우 활동 생성.
    // 판정은 클라이언트 계측(book_complete)과 같은 함수를 쓴다 — 두 곳에 각각
    // 적으면 한쪽만 고치는 날 활동 기록과 GA 수치가 조용히 어긋난다.
    if (isNewlyCompleted(oldBook?.status, body.status)) {
      await createActivity({
        supabase,
        userId: user.id,
        bookId: id,
        activityType: 'book_completed',
      });
    }

    return successResponse(data);
  } catch {
    return errorResponse('책 수정에 실패했습니다.');
  }
}

/**
 * DELETE /api/books/:id
 * 책 삭제 — 본인 소유 책만 삭제할 수 있다.
 *
 * 학습 포인트: Supabase delete()는 조건에 안 걸리는 행이 0개여도 에러를 던지지 않는다.
 * 그래서 .select()로 실제 삭제된 행을 받아 빈 배열이면 "소유자가 아니거나 없음"으로 처리한다.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;

    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('books')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select();

    if (error) return errorResponse(error.message);
    if (!data || data.length === 0) return notFoundResponse('책');

    return successResponse({ message: '삭제되었습니다.' });
  } catch {
    return errorResponse('책 삭제에 실패했습니다.');
  }
}
