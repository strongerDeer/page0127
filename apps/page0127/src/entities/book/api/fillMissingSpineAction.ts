'use server';

import { checkYes24SpineOnServer } from '@/shared/api/book-provider/checkYes24SpineOnServer';
import { createClient } from '@/shared/config/supabase/server';
import { missingSpineCandidate } from '@/shared/lib/spineImage';

/**
 * 결과: 'filled' 채움 · 'none' YES24 에도 책등이 없음(또는 대상 아님) · 'error' 확인 자체를 못 함
 */
export type SpineFillResult = 'filled' | 'none' | 'error';

/**
 * 내 책의 빈 책등을 **서버에서** 확인해 채운다.
 *
 * 왜 서버인가: 예전에는 사용자 브라우저가 1200px 책등을 받아 보고 판정했다. 폰 데이터가
 * 느리거나 담자마자 앱을 닫으면 확인이 끝나지 못했고, 다시 서재를 열지 않는 새 가입자의
 * 책은 영영 빈 책등으로 남았다 — 전체 도서에도 그대로 보였다(2026-11-04, 숨결이 바람 될 때).
 * 서버는 YES24 와 가깝고 사용자가 화면을 닫아도 이 요청을 끝까지 처리한다.
 *
 * 학습 포인트:
 * - 서버 액션 인자는 클라이언트가 보낸 값이다 → 책 id 만 받고, 나머지(출처·상품번호·
 *   지금 책등 값)는 DB 에서 다시 읽는다. 남의 책은 RLS 와 user_id 조건으로 막힌다.
 * - 회색 대체 이미지 판정은 브라우저보다 정확하다 — 크기와 **바이트 길이**를 함께 본다.
 */
export const fillMissingSpineAction = async (
  bookId: string
): Promise<SpineFillResult> => {
  if (typeof bookId !== 'string' || bookId.length === 0) return 'none';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'error';

  const { data: book, error: readError } = await supabase
    .from('books')
    .select('id, spine_image, source, provider_item_id')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (readError) return 'error';
  if (!book) return 'none';

  const candidate = missingSpineCandidate(book);
  if (!candidate) return 'none';

  const check = await checkYes24SpineOnServer(candidate);
  if (check !== 'real') return check;

  const { error: updateError } = await supabase
    .from('books')
    .update({ spine_image: candidate })
    .eq('id', book.id)
    .eq('user_id', user.id)
    .is('spine_image', null);
  if (updateError) {
    console.error('책등 채우기 실패:', updateError.message);
    return 'error';
  }
  return 'filled';
};
