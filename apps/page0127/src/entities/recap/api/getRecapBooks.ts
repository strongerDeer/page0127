import { createClient } from '@/shared/config/supabase/server';

import type { RecapBook } from '../model/types';

/**
 * 회상 카드에 필요한 칸만 골라 내 책을 가져온다.
 *
 * select 목록이 RecapBook 타입과 1:1로 맞는다. `select('*')` 를 쓰지 않는 이유는
 * books 에 description·toc 처럼 큰 칸이 있어서다.
 *
 * RLS: books 의 SELECT 정책은 `is_public = true OR auth.uid() = user_id` 다.
 * 여기서는 user_id 를 직접 걸어 내 책만 가져오므로 비공개 책도 회상에 들어온다.
 * 회상은 남에게 보여주는 화면이 아니라 내가 내 기록을 되돌아보는 자리라 이게 맞다.
 * (여러 사용자를 걸치는 집계였다면 is_public 을 명시해야 한다 — TodayStrip 참고)
 *
 * 실패하면 빈 배열을 준다. 회상은 곁들이는 화면이라 랜딩 전체를 막지 않는다.
 */
export const getRecapBooks = async (userId: string): Promise<RecapBook[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('books')
    .select(
      'id, title, author, cover_image, status, rating, completed_date, created_at'
    )
    .eq('user_id', userId);

  if (error) {
    console.error('회상용 책 조회 실패:', error.message);
    return [];
  }

  return data ?? [];
};
