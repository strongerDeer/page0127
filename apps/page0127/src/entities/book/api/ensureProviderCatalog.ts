import { getBookProvider } from '@/shared/api/book-provider';
import { checkYes24SpineOnServer } from '@/shared/api/book-provider/checkYes24SpineOnServer';
import { createAdminClient } from '@/shared/config/supabase/admin';
import { missingSpineCandidate } from '@/shared/lib/spineImage';

type EnsureOptions = {
  /**
   * 새로 넣는 책의 책등도 서버에서 확인해 함께 저장한다.
   *
   * 왜 옵션인가: 사용자가 책을 담는 길(/api/books)은 담은 뒤 서재 책(books)의 책등을
   * 따로 확인하고, 그 값이 트리거로 global_books 에도 옮겨진다. 거기서 또 기다리면
   * 등록 응답만 최대 8초 늦어진다. 그래서 그 확인을 거치지 않는 길 — 어드민이 문장 책을
   * 전체 도서에 한꺼번에 넣을 때 — 만 켠다(2026-11-20, 홈 케미 그림 책등이 전부 비었던 원인).
   */
  withSpine?: boolean;
};

/**
 * 책등 후보를 서버에서 확인한다 — 진짜 책등일 때만 주소, 아니면 null(비워 두면 백필·서재 확인이 다시 채운다).
 * YES24 는 책등이 없어도 200 에 회색 그림을 주므로 checkYes24SpineOnServer 가 크기·바이트로 판정한다.
 */
const verifiedSpine = async (book: {
  source: string | null;
  providerItemId: string | null;
}): Promise<string | null> => {
  const candidate = missingSpineCandidate({
    spine_image: null,
    source: book.source,
    provider_item_id: book.providerItemId,
  });
  if (!candidate) return null;
  return (await checkYes24SpineOnServer(candidate)) === 'real'
    ? candidate
    : null;
};

/** 새 등록과 '책 다시 선택' 모두 서버가 공급자의 원본 서지 정보를 확인한다. */
export async function ensureProviderCatalog(
  isbn: string,
  { withSpine = false }: EnsureOptions = {}
): Promise<void> {
  const client = createAdminClient();
  const { data, error } = await client
    .from('global_books')
    .select('id')
    .eq('isbn', isbn)
    .maybeSingle();
  if (error) throw new Error('도서 정보를 확인하지 못했습니다.');
  if (data) return;
  const verified = await getBookProvider().getByIsbn(isbn);
  if (!verified)
    throw new Error('도서 정보를 찾지 못했어요. 직접 등록을 이용해 주세요.');
  const spineImage = withSpine ? await verifiedSpine(verified) : null;
  const { error: insertError } = await client.from('global_books').insert({
    isbn: verified.isbn,
    title: verified.title,
    sub_title: verified.subTitle,
    source: verified.source,
    provider_item_id: verified.providerItemId,
    author: verified.author,
    publisher: verified.publisher,
    cover_image: verified.coverImage,
    // 책등을 확인하지 않은 길은 지금처럼 비워 둔다(위 withSpine 주석)
    ...(spineImage ? { spine_image: spineImage } : {}),
    description: verified.description,
    pub_date: verified.pubDate,
    category: verified.category,
    review_status: 'approved',
  });
  if (insertError && insertError.code !== '23505')
    throw new Error('도서 정보 저장에 실패했습니다.');
}
