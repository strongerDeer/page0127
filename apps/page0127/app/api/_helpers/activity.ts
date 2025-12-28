import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 활동 생성 헬퍼 함수
 *
 * 학습 포인트:
 * - 공통 로직을 헬퍼로 분리
 * - 활동 타입별로 적절한 데이터 저장
 * - 에러 핸들링
 */

type CreateActivityParams = {
  supabase: SupabaseClient;
  userId: string;
  bookId: string;
  activityType: 'book_added' | 'book_completed' | 'review_added';
  content?: string; // 리뷰 내용
};

/**
 * 활동 생성
 */
export async function createActivity({
  supabase,
  userId,
  bookId,
  activityType,
  content,
}: CreateActivityParams) {
  try {
    const { error } = await supabase.from('activities').insert({
      user_id: userId,
      book_id: bookId,
      activity_type: activityType,
      content: content || null,
    });

    if (error) {
      console.error('활동 생성 실패:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('활동 생성 예외:', error);
    return { success: false, error };
  }
}
