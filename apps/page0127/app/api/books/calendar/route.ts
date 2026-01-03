import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../_helpers/auth';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * GET /api/books/calendar
 * 월별 완독한 책 조회 (독서 캘린더용)
 *
 * Query Parameters:
 * - year: 연도 (예: 2025)
 * - month: 월 (예: 12)
 *
 * Response:
 * {
 *   data: [
 *     {
 *       date: "2025-12-10",
 *       books: [{ id, title, author, cover, rating }]
 *     }
 *   ],
 *   summary: {
 *     totalBooks: 5,
 *     totalPages: 1520
 *   }
 * }
 *
 * 학습 포인트:
 * - Date Range 쿼리: between() 사용
 * - GROUP BY 날짜별 책 그룹핑
 * - 집계 함수: count, sum
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;

    // 인증 확인
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    // 쿼리 파라미터 추출
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return errorResponse('year와 month 파라미터가 필요합니다.');
    }

    // 날짜 범위 계산 (해당 월의 1일 ~ 마지막 날)
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(Number(year), Number(month), 0)
      .toISOString()
      .split('T')[0]; // 해당 월의 마지막 날

    // 완독한 책 조회 (completed_date 기준)
    const { data: books, error } = await supabase
      .from('books')
      .select('id, title, author, cover_image, rating, completed_date, page_count')
      .eq('user_id', user!.id)
      .eq('status', 'completed') // 완독한 책만
      .not('completed_date', 'is', null) // completed_date가 null이 아닌 것만
      .gte('completed_date', startDate) // 시작일 이상
      .lte('completed_date', endDate) // 종료일 이하
      .order('completed_date', { ascending: true });

    if (error) return errorResponse(error.message);

    // 날짜별로 책 그룹핑
    const booksByDate = new Map<
      string,
      Array<{
        id: string;
        title: string;
        author: string;
        cover: string | null;
        rating: number | null;
      }>
    >();
    let totalPages = 0;

    books?.forEach((book) => {
      const date = book.completed_date; // YYYY-MM-DD 형식
      if (!booksByDate.has(date)) {
        booksByDate.set(date, []);
      }
      booksByDate.get(date)!.push({
        id: book.id,
        title: book.title,
        author: book.author,
        cover: book.cover_image,
        rating: book.rating,
      });

      // 총 쪽수 계산
      if (book.page_count) {
        totalPages += book.page_count;
      }
    });

    // Map을 배열로 변환
    const result = Array.from(booksByDate.entries()).map(([date, books]) => ({
      date,
      books,
    }));

    return successResponse({
      data: result,
      summary: {
        totalBooks: books?.length || 0,
        totalPages,
      },
    });
  } catch {
    return errorResponse('캘린더 데이터 조회에 실패했습니다.');
  }
}
