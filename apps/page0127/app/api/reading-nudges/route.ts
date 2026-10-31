import { NextRequest } from 'next/server';

import { getBookProvider } from '@/shared/api/book-provider';
import { createAdminClient } from '@/shared/config/supabase/admin';

import { getCurrentUser, getSupabaseClient } from '../_helpers/auth';
import { schedulePush } from '../_helpers/push';
import { errorResponse, successResponse } from '../_helpers/response';

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getCurrentUser();
  if (authError) return authError;
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.recipientId !== 'string' ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.recipientId) ||
    typeof body.message !== 'string' ||
    !body.message.trim() ||
    body.message.trim().length > 200 ||
    !['recommendation', 'invitation', 'note'].includes(body.kind) ||
    (body.bookIsbn != null &&
      (typeof body.bookIsbn !== 'string' || !/^\d{13}$/.test(body.bookIsbn))) ||
    (body.kind !== 'note' && !body.bookIsbn)
  )
    return errorResponse('보낼 메시지와 책을 확인해 주세요.', 400);
  try {
    const supabase = await getSupabaseClient();
    // 책 검색·저장 전에 관계를 확인하고, 실제 전송 RPC에서도 다시 검증한다.
    const { data: recipients, error: relationError } = await supabase.rpc(
      'get_reading_nudge_recipients'
    );
    if (relationError) return errorResponse('맞팔 여부를 확인하지 못했어요.');
    if (
      !recipients?.some(
        (row: { user_id: string }) => row.user_id === body.recipientId
      )
    )
      return errorResponse('맞팔한 사이에만 보낼 수 있어요.', 403);
    let catalogId: string | null = null;
    let pageCount: number | null = null;
    if (body.bookIsbn) {
      // 검색 결과의 표지·제목을 그대로 믿지 않고 공급자 상세에서 다시 확인한다.
      const book = await getBookProvider().getByIsbn(body.bookIsbn);
      if (!book)
        return errorResponse(
          '검색한 책을 찾지 못했어요. 다시 골라주세요.',
          404
        );
      pageCount = book.page;
      const { error } = await createAdminClient().from('global_books').insert({
        review_status: 'approved',
        isbn: book.isbn,
        title: book.title,
        sub_title: book.subTitle,
        author: book.author,
        publisher: book.publisher,
        cover_image: book.coverImage,
        // 공급자 책등 주소는 확인 전이라 회색 대체 이미지일 수 있다 — 비워 두면
        // 누군가 이 책을 담아 책등을 확인했을 때 트리거가 채운다(sync_global_spine_image)
        spine_image: null,
        description: book.description,
        pub_date: book.pubDate,
        category: book.category,
        source: book.source,
        provider_item_id: book.providerItemId,
      });
      if (error && error.code !== '23505')
        return errorResponse('책 정보를 준비하지 못했어요.');
      const { data, error: readError } = await supabase
        .from('global_books')
        .select('id')
        .eq('isbn', book.isbn)
        .single();
      if (readError || !data)
        return errorResponse('책 정보를 확인하지 못했어요.');
      catalogId = data.id;
    }
    const { data: id, error } = await supabase.rpc('send_reading_envelope', {
      p_user_id: body.recipientId,
      p_message: body.message.trim(),
      p_kind: body.kind,
      p_catalog_book_id: catalogId,
      p_page_count: pageCount,
    });
    if (error) return errorResponse(error.message, 400);
    if (typeof id !== 'string')
      return errorResponse('전송 결과를 확인하지 못했어요.');
    schedulePush([
      {
        id,
        user_id: body.recipientId,
        actor_id: user!.id,
        type: 'reading_nudge',
      },
    ]);
    return successResponse({ id }, 201);
  } catch {
    return errorResponse(
      '메시지를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.'
    );
  }
}
