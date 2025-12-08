import { createClient } from '@/shared/config/supabase/server';

import type { BookStats } from '../types';

/**
 * 사용자의 독서 통계 조회
 *
 * 학습 포인트:
 * - Server Component에서만 사용 (Server-Side 데이터 페칭)
 * - Supabase의 count() 기능으로 효율적인 통계 계산
 * - 에러 핸들링으로 안전한 데이터 반환
 *
 * @param userId - 사용자 ID
 * @returns 독서 통계 데이터
 */
export const getBookStats = async (userId: string): Promise<BookStats> => {
  const supabase = await createClient();

  try {
    // 1. 전체 책 수 조회 (모든 상태)
    const { count: totalBooks, error: totalError } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (totalError) throw totalError;

    // 2. 완독한 책 수 조회
    const { count: completedBooks, error: completedError } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (completedError) throw completedError;

    // 3. 완독률 계산 (0-100)
    const completionRate =
      totalBooks && totalBooks > 0
        ? Math.round((completedBooks! / totalBooks) * 100)
        : 0;

    return {
      totalCompletedBooks: completedBooks ?? 0,
      totalPages: 0, // MVP에서는 0 (향후 구현)
      yearlyGoal: 50, // MVP에서는 기본값 50 (향후 user 프로필에서 가져오기)
      completionRate,
    };
  } catch (error) {
    console.error('통계 조회 실패:', error);

    // 에러 발생 시 기본값 반환
    return {
      totalCompletedBooks: 0,
      totalPages: 0,
      yearlyGoal: 50,
      completionRate: 0,
    };
  }
};
