import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../_helpers/auth';
import { errorResponse, successResponse } from '../_helpers/response';

/**
 * GET /api/books
 * 책 목록 조회 (쿼리 파라미터로 필터링 가능)
 *
 * 학습 포인트:
 * - 공통 헬퍼로 깔끔한 코드
 * - Query Parameter 처리
 * - Supabase 조건부 쿼리
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const order = searchParams.get('order') || 'desc';

    // Supabase 쿼리 빌더
    let query = supabase.from('books').select('*');

    // 상태별 필터링 (선택적)
    if (status) {
      query = query.eq('status', status);
    }

    // 정렬 적용
    query = query.order(sortBy, { ascending: order === 'asc' });

    const { data, error } = await query;

    if (error) return errorResponse(error.message);

    return successResponse(data);
  } catch (error) {
    return errorResponse('책 목록 조회에 실패했습니다.');
  }
}

/**
 * POST /api/books
 * 새 책 추가
 *
 * 학습 포인트:
 * - 공통 헬퍼로 중복 제거
 * - 인증 확인 간소화
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const body = await request.json();

    // 인증 확인 (헬퍼 사용)
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    // 책 추가 (user_id 자동 포함)
    const { data, error } = await supabase
      .from('books')
      .insert({
        ...body,
        user_id: user!.id,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message);

    return successResponse(data, 201);
  } catch (error) {
    return errorResponse('책 추가에 실패했습니다.');
  }
}
