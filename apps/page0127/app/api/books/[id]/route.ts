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
 * 학습 포인트:
 * - 공통 헬퍼로 깔끔한 에러 처리
 * - Dynamic Route Parameter 처리
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return notFoundResponse('책');

    return successResponse(data);
  } catch {
    return errorResponse('책 조회에 실패했습니다.');
  }
}

/**
 * PATCH /api/books/:id
 * 책 정보 수정
 *
 * 학습 포인트:
 * - PATCH vs PUT: 부분 수정
 * - updated_at 자동 업데이트
 * - status가 completed로 변경 시 활동 생성
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    // 현재 사용자 정보 가져오기
    const { user } = await getCurrentUser();

    // 기존 책 정보 조회 (status 변경 확인용)
    const { data: oldBook } = await supabase
      .from('books')
      .select('status')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('books')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return errorResponse(error.message);

    // status가 completed로 변경된 경우 활동 생성
    if (
      user &&
      oldBook?.status !== 'completed' &&
      body.status === 'completed'
    ) {
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
 * 책 삭제
 *
 * 학습 포인트:
 * - DELETE 메서드
 * - 204 vs 200 응답 (여기서는 200 + 메시지)
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;

    const { error } = await supabase.from('books').delete().eq('id', id);

    if (error) return errorResponse(error.message);

    return successResponse({ message: '삭제되었습니다.' });
  } catch {
    return errorResponse('책 삭제에 실패했습니다.');
  }
}
