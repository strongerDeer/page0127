import { createAnonClient } from '@/shared/config/supabase/anon';

import { COVER_LIMIT } from './getPublicShelfSummary';

/**
 * 지금 읽는 중인 공개 책의 표지 — 최근에 시작한 순, 최대 COVER_LIMIT 장.
 *
 * 스토리 이미지는 완독 책으로 그린다. 완독이 하나도 없고 읽는 중인 책만 있으면
 * 흰 면이 비어 버려서, 그때만 이 표지로 대신 세운다(완독이 있으면 부르지 않는다).
 * 실패하면 빈 배열 — 이미지는 그래도 나가야 한다.
 */
export const getPublicReadingCovers = async (
  userId: string
): Promise<string[]> => {
  const { data, error } = await createAnonClient()
    .from('books')
    .select('cover_image')
    .eq('user_id', userId)
    .eq('status', 'reading')
    .eq('is_public', true)
    .not('cover_image', 'is', null)
    .order('created_at', { ascending: false })
    .limit(COVER_LIMIT * 2);

  if (error) {
    console.error('읽는 중 표지 조회 실패:', error.message);
    return [];
  }

  // 재독 중인 책은 같은 표지가 겹칠 수 있다
  return [
    ...new Set(
      (data ?? [])
        .map((row) => row.cover_image)
        .filter((url): url is string => Boolean(url))
    ),
  ].slice(0, COVER_LIMIT);
};
