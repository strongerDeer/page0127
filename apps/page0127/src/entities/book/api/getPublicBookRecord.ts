import { createAnonClient } from '@/shared/config/supabase/anon';

/** 공유 카드·메타데이터에 쓰는 책 기록의 최소 필드 */
export type PublicBookRecord = {
  title: string;
  author: string | null;
  cover_image: string | null;
  rating: number | null;
  one_line_review: string | null;
};

/**
 * 공개된 책 기록 한 건 — 공유 카드·메타데이터용.
 *
 * **비공개 기록은 소유자에게도 돌려주지 않는다.** 페이지 본문은 소유자에게 자기
 * 비공개 책을 보여주지만((public)/[username]/[bookId]/page.tsx 54–56행), 미리보기는
 * 링크를 받은 사람이 볼 것과 같아야 한다. 소유자가 비공개 기록 링크를 어딘가에
 * 붙였을 때 한줄평이 카드로 새어 나가면 그건 사용자가 의도한 공개가 아니다.
 *
 * 그래서 세션을 읽지 않는 익명 클라이언트를 쓰고, is_public 도 직접 명시한다
 * (RLS 는 익명 방문자만 걸러주므로 조건을 생략하면 세션 유무로 결과가 갈린다).
 */
export const getPublicBookRecord = async (
  userId: string,
  bookId: string
): Promise<PublicBookRecord | null> => {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('books')
    .select('title, author, cover_image, rating, one_line_review')
    .eq('id', bookId)
    .eq('user_id', userId)
    .eq('is_public', true)
    .maybeSingle();

  if (error) {
    console.error('공개 책 기록 조회 실패:', error.message);
    return null;
  }

  return data;
};
