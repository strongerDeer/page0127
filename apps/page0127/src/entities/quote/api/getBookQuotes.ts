import type { BookQuote } from '../model/types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 이 책(ISBN)에 내가 적은 문장 — 적은 순서대로.
 *
 * 클라이언트를 인자로 받는 이유: 이 파일이 next/headers 를 끌어오지 않아야
 * entities/quote 의 index 를 클라이언트 컴포넌트에서도 안전하게 import 할 수 있다.
 *
 * RLS 가 본인 행만 보여 주지만 user_id 도 직접 건다 — 의도를 코드에 남기고,
 * 인덱스(user_id, isbn, created_at)를 그대로 탄다.
 * 실패하면 빈 배열 — 문장은 곁들이는 칸이라 책 상세 전체를 막지 않는다.
 */
export const getBookQuotes = async (
  client: SupabaseClient,
  userId: string,
  isbn: string
): Promise<BookQuote[]> => {
  const { data, error } = await client
    .from('book_quotes')
    .select('id, isbn, text, page, created_at')
    .eq('user_id', userId)
    .eq('isbn', isbn)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('책 문장 조회 실패:', error.message);
    return [];
  }

  return data ?? [];
};
