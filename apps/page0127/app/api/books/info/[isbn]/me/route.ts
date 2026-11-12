import { getVerifiedUser } from '@/shared/lib/auth/getVerifiedUser';

import { BOOK_WITH_MEMO_SELECT, withPersonalMemo } from '@/entities/book';

import { getConnectedReaders } from '@/widgets/book/api/getBookReaders';

import { getSupabaseClient } from '../../../../_helpers/auth';
import { errorResponse, successResponse } from '../../../../_helpers/response';

import type { BookInfoMe } from '@/widgets/book/model/bookInfoMe';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ isbn: string }> };

/**
 * GET /api/books/info/[isbn]/me — 책 정보 페이지의 "나만의 부분".
 *
 * 책 정보 페이지는 CDN 에 캐시돼서(ISR) 서버가 누가 보는지 모른다.
 * 그래서 사람마다 다른 것만 로그인한 브라우저가 여기서 한 번에 받는다.
 * - 내 서재에 있나 (담기 버튼)
 * - 나의 기록 (상태·별점·한줄평·메모·태그)
 * - 나와 이어진 리더 얼굴 (나·팔로잉·팔로워)
 *
 * 비로그인은 부르지 않지만(클라이언트가 막는다), 불러도 200 + null 로 답한다 — /api/auth/me 와 같은 이유.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { isbn } = await params;

  try {
    const supabase = await getSupabaseClient();
    const user = await getVerifiedUser(supabase.auth);

    if (!user) {
      const response = successResponse<BookInfoMe | null>(null);
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }

    const [memoResult, readers] = await Promise.all([
      // maybeSingle 대신 limit(1): 재독으로 같은 ISBN 이 두 행이면 single 계열은 에러를 내고
      // 예전 서버 컴포넌트는 그때 기록 카드를 접었다. 여기선 최근 행 하나를 보여 준다.
      supabase
        .from('books')
        .select(BOOK_WITH_MEMO_SELECT)
        .eq('user_id', user.id)
        .eq('isbn', isbn)
        .order('updated_at', { ascending: false })
        .limit(1),
      getConnectedReaders(supabase, isbn, user.id),
    ]);

    if (memoResult.error) {
      console.warn(
        `[books/info/me] 내 기록 조회 실패 (isbn=${isbn}): ${memoResult.error.message}`
      );
    }

    const row = memoResult.data?.[0];
    const myBook = row ? withPersonalMemo(row) : null;

    const body: BookInfoMe = {
      // 조회가 깨졌으면 "없음"으로 단정하지 않는다 — 담기 버튼이 중복 담기를 만들 수 있다
      isInLibrary: memoResult.error ? true : !!myBook,
      myBook: myBook
        ? {
            status: myBook.status,
            rating: myBook.rating,
            is_life_book: myBook.is_life_book,
            one_line_review: myBook.one_line_review,
            personal_memo: myBook.personal_memo,
            tags: myBook.tags,
          }
        : null,
      readers,
    };

    const response = successResponse(body);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch {
    const response = errorResponse(
      '내 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
      503
    );
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
}
