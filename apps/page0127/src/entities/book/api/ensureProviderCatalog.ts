import { getBookProvider } from '@/shared/api/book-provider';
import { createAdminClient } from '@/shared/config/supabase/admin';

/** 새 등록과 '책 다시 선택' 모두 서버가 공급자의 원본 서지 정보를 확인한다. */
export async function ensureProviderCatalog(isbn: string): Promise<void> {
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
  const { error: insertError } = await client.from('global_books').insert({
    isbn: verified.isbn,
    title: verified.title,
    sub_title: verified.subTitle,
    source: verified.source,
    provider_item_id: verified.providerItemId,
    author: verified.author,
    publisher: verified.publisher,
    cover_image: verified.coverImage,
    description: verified.description,
    pub_date: verified.pubDate,
    category: verified.category,
    review_status: 'approved',
  });
  if (insertError && insertError.code !== '23505')
    throw new Error('도서 정보 저장에 실패했습니다.');
}
