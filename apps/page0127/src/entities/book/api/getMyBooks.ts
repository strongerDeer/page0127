import { createClient } from '@/shared/config/supabase/server';

import type { Book } from '../types';

/**
 * 사용자의 모든 책 목록 조회 (Server Component용)
 *
 * 학습 포인트:
 * - Server Component에서만 사용
 * - 완독한 책만 조회 (대시보드용)
 * - 완독일 기준 내림차순 정렬
 * - 연도별 필터링 지원
 *
 * @param userId - 사용자 ID
 * @param year - 통계 조회 연도 (null = 전체)
 * @returns 책 목록
 */
export const getMyBooks = async (
  userId: string,
  year: number | null = null
): Promise<Book[]> => {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('completed_date', { ascending: false });

    // 연도 필터 적용
    if (year !== null) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query
        .gte('completed_date', startDate)
        .lte('completed_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data ?? [];
  } catch (error) {
    console.error('책 목록 조회 실패:', error);
    return [];
  }
};

/**
 * 사용자가 책을 읽은 연도 목록 조회
 *
 * 학습 포인트:
 * - 완독한 책의 연도를 중복 제거하여 반환
 * - 내림차순 정렬 (최신 연도부터)
 *
 * @param userId - 사용자 ID
 * @returns 연도 목록
 */
export const getAvailableYears = async (userId: string): Promise<number[]> => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('books')
      .select('completed_date')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('completed_date', 'is', null);

    if (error) throw error;

    // 연도 추출 및 중복 제거
    const years = new Set<number>();
    data?.forEach((book) => {
      if (book.completed_date) {
        const year = new Date(book.completed_date).getFullYear();
        years.add(year);
      }
    });

    // 내림차순 정렬
    return Array.from(years).sort((a, b) => b - a);
  } catch (error) {
    console.error('연도 목록 조회 실패:', error);
    return [];
  }
};
