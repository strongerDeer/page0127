import { cache } from 'react';

import { createAnonClient } from '@/shared/config/supabase/anon';

import { catalogVisibilityFilter } from '@/entities/book/api/catalogVisibility';

/**
 * 이야기 페이지 위 책 카드에 쓸 표지·출판사.
 *
 * 쿠키 없는 익명 클라이언트로 읽는다 — 이 페이지는 캐시해 두는 정적 페이지(ISR)라
 * 로그인을 읽는 순간 매 요청 렌더링으로 돌아간다. 책을 못 찾아도(삭제·승인 취소) 이야기는
 * 보여야 하므로 null 을 돌려주고, 카드는 글에 복사해 둔 제목·저자로 그린다.
 */
export const getStoryBook = cache(async (bookId: string) => {
  // 빌드 때 미리 그리는 페이지라 DB 설정이 없는 빌드(CI 타입·빌드 검사)에서도 돌아간다.
  // createAnonClient 는 env 가 없으면 throw 한다 → 그때도 표지 없이 글자 표지로 그린다
  // (운영 빌드에는 env 가 있고, revalidate 로 하루 안에 다시 읽는다).
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('global_books')
      .select('id, title, author, publisher, cover_image, provider_item_id')
      .eq('id', bookId)
      .eq('review_status', 'approved')
      .or(catalogVisibilityFilter(null))
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn(
      `[blog] 책 조회 실패 (id=${bookId}): ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
});
