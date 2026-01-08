import { NextRequest } from 'next/server';

import { getSupabaseClient } from '../../_helpers/auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/books/global
 * 전체 도서 목록 조회 (전역 라이브러리)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Sorting
    const sort = searchParams.get('sort') || 'created_at'; // created_at, title, author
    const order = searchParams.get('order') || 'desc';

    // Search
    const search = searchParams.get('q') || '';

    let query = supabase
      .from('global_books')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    }

    // 정렬
    query = query.order(sort, { ascending: order === 'asc' });

    // 페이징
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) return errorResponse(error.message);

    return successResponse({
      books: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: count ? Math.ceil(count / limit) : 0,
      }
    });
  } catch {
    return errorResponse('전체 도서 목록 조회에 실패했습니다.');
  }
}
