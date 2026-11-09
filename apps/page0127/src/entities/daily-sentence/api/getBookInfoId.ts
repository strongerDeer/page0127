import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 문장의 ISBN 으로 우리 "도서 정보" 화면(/books/info/[id]) 의 id 를 찾는다. 없으면 null.
 *
 * 문장 행에는 global_books.id 를 두지 않았다 — 운영자가 고른 책이 아직 아무에게도 담기지 않았을
 * 수 있고, 나중에 누군가 담으면 그때부터 연결되는 편이 낫다. 그래서 볼 때 ISBN 으로 찾는다.
 *
 * 서점 책만 찾는다(직접 등록 책은 등록한 사람에게만 보이므로 링크로 보내면 404 가 난다).
 * 찾지 못해도 화면은 "서재에 담기" 링크로 대신하니 에러는 로그만 남긴다.
 */
export const getBookInfoId = async (
  client: SupabaseClient,
  isbn: string | null
): Promise<string | null> => {
  if (!isbn) return null;
  const { data, error } = await client
    .from('global_books')
    .select('id')
    .eq('isbn', isbn)
    .eq('review_status', 'approved')
    .or('source.is.null,source.neq.manual')
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    console.error('오늘의 문장 도서 정보 찾기 실패:', error.message);
    return null;
  }
  return data?.id ?? null;
};
