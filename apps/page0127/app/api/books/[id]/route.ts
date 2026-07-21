import { NextRequest } from 'next/server';

import { createActivity } from '../../_helpers/activity';
import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import {
  errorResponse,
  notFoundResponse,
  successResponse,
} from '../../_helpers/response';

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

    // status가 completed로 변경된 경우 활동 생성
    if (oldBook?.status !== 'completed' && body.status === 'completed') {
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
