import type { RandomQuote } from '../model/types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 내 문장 하나를 무작위로 — RPC random_book_quote (마이그레이션 20261109000100).
 *
 * 왜 서버에서 고르나: 클라이언트에서 Math.random() 으로 고르면 서버가 그린 HTML 과
 * 브라우저가 그린 결과가 달라 hydration 불일치가 난다. 서버가 하나를 골라 내려주면
 * 화면은 그 값만 그린다. 새로고침할 때마다 다른 문장이 나온다.
 *
 * 문장이 없거나 실패하면 null — 카드를 그리지 않는다.
 */
export const getRandomQuote = async (
  client: SupabaseClient
): Promise<RandomQuote | null> => {
  const { data, error } = await client
    .rpc('random_book_quote')
    .maybeSingle<RandomQuote>();

  if (error) {
    console.error('무작위 책 문장 조회 실패:', error.message);
    return null;
  }

  return data ?? null;
};
