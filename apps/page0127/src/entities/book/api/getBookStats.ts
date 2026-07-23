import { createClient } from '@/shared/config/supabase/server';

import {
  calculateBookStats,
  getCurrentLibraryYear,
} from '../model/libraryPeriod';

import type { Book } from '../types';
import type { BookStats } from '../types/stats';

/**
 * 사용자의 책 통계를 조회한다.
 *
 * 목록을 한 번만 조회한 뒤 통계는 메모리에서 계산한다.
 * 이전에는 count 2회와 데이터 1회를 직렬 호출해 연도 전환이 느렸다.
 */
export const getBookStats = async (
  userId: string,
  year: number | null = null,
  publicOnly = false
): Promise<BookStats> => {
  const supabase = await createClient();

  try {
    let query = supabase.from('books').select('*').eq('user_id', userId);

    // 공개 서재 경로에서는 RLS와 별개로 공개 책만 명시적으로 집계한다.
    if (publicOnly) {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return calculateBookStats(
      (data ?? []) as Book[],
      year,
      getCurrentLibraryYear()
    );
  } catch (error) {
    console.error('통계 조회 실패:', error);

    return {
      totalCompletedBooks: 0,
      totalPages: 0,
      yearlyGoal: 50,
      completionRate: 0,
      monthlyReading: [],
      categoryReading: [],
      ratingReading: [],
      averageRating: 0,
      fiveStarBooks: 0,
    };
  }
};
