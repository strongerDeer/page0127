import { createAnonClient } from '@/shared/config/supabase/anon';

import { type TopBook, type TopBookRow, toTopBooks } from '../model/topBooks';

import 'server-only';

/**
 * 많이 읽힌 책 상위 n권 — 랜딩 랭킹과 같은 공개 RPC.
 * get_most_read_books 는 anon 실행이 허용돼 있고 is_public = true 인 완독만 센다.
 */
export const getWeeklyTop = async (limit = 3): Promise<TopBook[]> => {
  const { data, error } = await createAnonClient().rpc('get_most_read_books', {
    limit_count: limit,
  });
  if (error) {
    // 카드 하나의 내용이다 — 실패해도 페이지는 그린다
    console.error('[about] 랭킹 조회 실패:', error.message);
    return [];
  }
  return toTopBooks(
    (data as TopBookRow[] | null) ?? [],
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  );
};
