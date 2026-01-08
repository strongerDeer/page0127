import { NextRequest } from 'next/server';

import { getSupabaseClient } from '../../_helpers/auth';
import { errorResponse, successResponse } from '../../_helpers/response';

export const dynamic = 'force-dynamic'; // 실시간 랭킹이므로 캐싱하지 않음

/**
 * GET /api/books/ranking
 * 도서 랭킹 조회 (인생책, 완독왕)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'best_rated'; // best_rated | most_read
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    let data;
    let error;

    if (type === 'best_rated') {
      // 인생책 (평점 10점 랭킹)
      const result = await supabase.rpc('get_books_of_life', { limit_count: limit });
      data = result.data;
      error = result.error;
    } else if (type === 'most_read') {
      // 완독왕 (가장 많이 읽은/등록된 책)
      const result = await supabase.rpc('get_most_read_books', { limit_count: limit });
      data = result.data;
      error = result.error;
    } else {
      return errorResponse('잘못된 랭킹 타입입니다.');
    }

    if (error) {
        console.error('Ranking Error:', error);
        return errorResponse(error.message);
    }

    return successResponse(data || []);
  } catch (e) {
    console.error(e);
    return errorResponse('랭킹 조회에 실패했습니다.');
  }
}
