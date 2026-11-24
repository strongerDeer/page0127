'use server';

import { getBookProvider } from '@/shared/api/book-provider';
import { createClient } from '@/shared/config/supabase/server';
import { isDemoUser } from '@/shared/lib/demo/demoAccount';

/**
 * 결과: 'filled' 채움 · 'none' 대상 아님(이미 있음·직접 등록·YES24 에도 쪽수 없음) · 'error' 확인 자체를 못 함
 */
export type PageCountFillResult = 'filled' | 'none' | 'error';

/**
 * 내 책의 빈 쪽수를 **서버에서** YES24 상세로 채운다.
 *
 * 왜 필요한가: 가입 맛보기에서 고른 책은 전체 도서(global_books, 쪽수 칸 없음)나 검색 목록
 * (쪽수는 상세 detail=Y 로만 온다)에서 온다. 그대로 담으면 page_count 가 비어
 * 서재 "읽은 쪽수 0쪽 · 예상 독서 시간 0시간"이 됐다(HJ, 2026-11-24).
 * /books/add 는 담기 전에 상세를 불러 쪽수를 넣으므로 이 경로만 비었다.
 *
 * 학습 포인트:
 * - fillMissingSpineAction 과 같은 모양 — 인자는 책 id 하나, 나머지(ISBN·출처·지금 쪽수)는
 *   DB 에서 다시 읽는다. 클라이언트가 보낸 쪽수를 믿지 않는다.
 * - 업데이트에 `.is('page_count', null)` 을 건다 — 그사이 사용자가 직접 고친 값은 덮지 않는다.
 * - YES24 상세는 24시간 캐시라 같은 책을 여러 사람이 담아도 호출이 늘지 않는다.
 */
export const fillMissingPageCountAction = async (
  bookId: string
): Promise<PageCountFillResult> => {
  if (typeof bookId !== 'string' || bookId.length === 0) return 'none';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'error';
  // 체험 계정의 책은 시드 그대로 둔다(쓰기 금지)
  if (isDemoUser(user)) return 'none';

  const { data: book, error: readError } = await supabase
    .from('books')
    .select('id, isbn, source, page_count')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (readError) return 'error';
  // 직접 등록한 책은 ISBN 이 서점 것이 아닐 수 있다 → 묻지 않는다
  if (!book || book.page_count !== null || book.source === 'manual')
    return 'none';
  if (!book.isbn) return 'none';

  let page: number | null;
  try {
    page = (await getBookProvider().getByIsbn(book.isbn))?.page ?? null;
  } catch {
    return 'error';
  }
  if (!page || page <= 0) return 'none';

  const { error: updateError } = await supabase
    .from('books')
    .update({ page_count: page })
    .eq('id', book.id)
    .eq('user_id', user.id)
    .is('page_count', null);
  if (updateError) {
    console.error('쪽수 채우기 실패:', updateError.message);
    return 'error';
  }
  return 'filled';
};
