import { createAdminClient } from '@/shared/config/supabase/admin';

import { maskPrivateBooks } from '../model/maskPrivateBook';

import type { Book } from '../types';

import 'server-only';

/**
 * 방문자에게 보여 줄 "북커버 씌운" 비공개 완독 책.
 *
 * 비공개 책은 RLS 가 방문자에게 아예 돌려주지 않으므로 service_role 로 읽는다.
 * 대신 무슨 책인지 알 수 있는 칸은 select 에서부터 빼고, maskPrivateBooks 로
 * id·isbn 까지 순번으로 바꾼 뒤에만 화면으로 넘긴다.
 * 읽는 중·읽고 싶어요는 세지 않는다 — "독서 카운터"는 완독 수라서다.
 */
export const getMaskedPrivateBooks = async (
  userId: string
): Promise<Book[]> => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('books')
      .select(
        'isbn, status, read_count, completed_date, completed_year, created_at'
      )
      .eq('user_id', userId)
      .eq('is_public', false)
      .eq('status', 'completed');

    if (error) {
      console.error('비공개 책 수 조회 실패:', error.message);
      return [];
    }

    return maskPrivateBooks(data ?? [], userId);
  } catch (error) {
    // 키가 없는 로컬 등 — 예전처럼 공개 책만 보이면 된다
    console.error('비공개 책 수 조회 실패:', error);
    return [];
  }
};
