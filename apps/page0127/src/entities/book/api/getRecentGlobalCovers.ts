import { createAnonClient } from '@/shared/config/supabase/anon';

/**
 * 전체 도서 공유 카드에 세울 표지 — 최근 서비스에 들어온 책 순.
 *
 * 익명 클라이언트로 조회한다. 공유 카드는 누가 보든 같아야 하고, global_books 는
 * 로그인 없이 열리는 카탈로그라 익명으로 읽을 수 있는 범위가 곧 카드의 범위다.
 * 실패하면 빈 배열 — 카드는 표지 없이 브랜드 카드로 떨어진다.
 */
export const getRecentGlobalCovers = async (
  limit: number
): Promise<string[]> => {
  const { data, error } = await createAnonClient()
    .from('global_books')
    .select('cover_image')
    .not('cover_image', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('전체 도서 표지 조회 실패:', error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => row.cover_image)
    .filter((url): url is string => Boolean(url));
};
