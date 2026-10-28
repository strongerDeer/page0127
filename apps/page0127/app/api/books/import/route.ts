import { NextRequest } from 'next/server';

import { getBookProvider } from '@/shared/api/book-provider';
import { createAdminClient } from '@/shared/config/supabase/admin';
import { quotePostgrestValue } from '@/shared/lib/postgrestFilter';

import { MAX_IMPORT_ROWS } from '@/features/book-import/model/limits';
import { mapWithLimit } from '@/features/book-import/model/mapWithLimit';
import { parseImportPayload } from '@/features/book-import/model/parseImportPayload';

import { getCurrentUser, getSupabaseClient } from '@/app/api/_helpers/auth';
import { errorResponse, successResponse } from '@/app/api/_helpers/response';

import type { ProviderBook } from '@/entities/book';
import type {
  ImportBookPayload,
  ImportResponse,
} from '@/features/book-import/model/types';

const PROVIDER_CONCURRENCY = 4;

export const maxDuration = 60;

/**
 * POST /api/books/import
 * 확인 화면에서 고른 책들을 한 번에 서재에 담는다
 *
 * POST /api/books 를 여러 번 부르지 않고 따로 둔 이유:
 * - 레이트 리밋 — 표준 등급이 분당 60회라 중복 확인+등록을 권마다 하면 30권도 못 넘긴다
 * - 활동 기록 — 한 권 담기는 "완독했어요" 활동을 남기는데, 지난 독서 기록 50권을 옮기면
 *   팔로워 스트림이 같은 시각의 50줄로 덮인다. 옮겨 온 기록은 지금 일어난 일이 아니므로
 *   활동을 남기지 않는다.
 *
 * 책 정보는 ISBN 으로 서버가 공급자에서 다시 받는다 (types.ts 의 ImportBookPayload 참고).
 * 이미 서재에 있는 책은 건너뛴다 — 재독은 한 권 등록 화면에서 회차를 확인하며 담는다.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;
    const userId = user!.id;

    const body = (await request.json().catch(() => null)) as {
      books?: unknown;
    } | null;
    const payload = parseImportPayload(body?.books, MAX_IMPORT_ROWS);
    if (!payload)
      return errorResponse('담을 책 목록이 올바르지 않습니다.', 400);

    const provider = getBookProvider();
    const fetched = await mapWithLimit(payload, PROVIDER_CONCURRENCY, (item) =>
      provider.getByIsbn(item.isbn).catch((error: unknown) => {
        console.warn('일괄 등록 상세 조회 실패:', error);
        return null;
      })
    );
    const pairs = payload.flatMap((item, i) => {
      const book = fetched[i];
      return book ? [{ item, book }] : [];
    });
    let failed = payload.length - pairs.length;

    const supabase = await getSupabaseClient();
    const existing = await findExistingKeys(
      supabase,
      userId,
      pairs.map((p) => p.book)
    );
    if (!existing) return errorResponse('서재를 확인하지 못했습니다.');

    const fresh = pairs.filter(
      ({ book }) =>
        !existing.has(book.isbn) &&
        !(book.providerItemId && existing.has(book.providerItemId))
    );
    const skipped = pairs.length - fresh.length;

    if (fresh.length === 0) {
      return successResponse<ImportResponse>({ added: 0, skipped, failed });
    }

    // 공용 카탈로그 — 이미 있는 책은 그대로 둔다 (한 권 등록의 23505 무시와 같은 뜻)
    const { error: globalError } = await createAdminClient()
      .from('global_books')
      .upsert(
        fresh.map(({ book }) => toGlobalBookRow(book)),
        { onConflict: 'isbn', ignoreDuplicates: true }
      );
    if (globalError) {
      console.error('일괄 등록 global_books 동기화 실패:', globalError);
    }

    const { data, error } = await supabase
      .from('books')
      .insert(fresh.map(({ item, book }) => toBookRow(userId, item, book)))
      .select('id');

    if (error) {
      // 한 번에 넣으므로 실패하면 전부 안 담긴 것이다 — 일부만 담겼다고 말하지 않는다
      console.error('일괄 등록 실패:', error);
      return errorResponse('책을 담지 못했습니다.');
    }

    failed += fresh.length - data.length;
    return successResponse<ImportResponse>(
      { added: data.length, skipped, failed },
      201
    );
  } catch {
    return errorResponse('책을 담는 중 오류가 발생했습니다.');
  }
}

/** 서재에 이미 있는 isbn·상품번호 모음. 조회 실패면 null (중복을 만들 수 있으니 담지 않는다) */
const findExistingKeys = async (
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  userId: string,
  books: ProviderBook[]
): Promise<Set<string> | null> => {
  if (books.length === 0) return new Set();
  const isbns = books.map((b) => quotePostgrestValue(b.isbn));
  const ids = books.flatMap((b) =>
    b.providerItemId ? [quotePostgrestValue(b.providerItemId)] : []
  );
  const filters = [`isbn.in.(${isbns.join(',')})`];
  if (ids.length) filters.push(`provider_item_id.in.(${ids.join(',')})`);

  const { data, error } = await supabase
    .from('books')
    .select('isbn, provider_item_id')
    .eq('user_id', userId)
    .or(filters.join(','));
  if (error) {
    console.error('일괄 등록 중복 확인 실패:', error);
    return null;
  }
  return new Set(
    data.flatMap((b) => [b.isbn, b.provider_item_id].filter(Boolean))
  );
};

const toGlobalBookRow = (book: ProviderBook) => ({
  review_status: 'approved',
  isbn: book.isbn,
  title: book.title,
  sub_title: book.subTitle,
  source: book.source,
  provider_item_id: book.providerItemId,
  author: book.author,
  publisher: book.publisher,
  cover_image: book.coverImage,
  spine_image: null,
  description: book.description,
  pub_date: book.pubDate,
  category: book.category,
});

/** 한 권 등록(books/add)이 만드는 행과 같은 모양 — 다른 점은 사용자 입력이 표에서 왔다는 것뿐이다 */
const toBookRow = (
  userId: string,
  item: ImportBookPayload,
  book: ProviderBook
) => {
  const completed = item.status === 'completed';
  return {
    user_id: userId,
    isbn: book.isbn,
    title: book.title,
    sub_title: book.subTitle,
    source: book.source,
    provider_item_id: book.providerItemId,
    author: book.author,
    publisher: book.publisher,
    cover_image: book.coverImage,
    // 브라우저가 진짜 책등인지 확인한 것만 담는다 (spineImage.ts — YES24 는 없는 책등도 200 을 준다)
    spine_image: item.spine_ok ? book.spineImage : null,
    description: book.description,
    pub_date: book.pubDate,
    category: book.category,
    page_count: book.page,
    read_count: 1,
    status: item.status,
    // 완독일·연도는 완독일 때만 의미가 있다 — 읽는 중인 책에 완독일이 붙으면 그해 책장에 잡힌다
    completed_date: completed ? item.completed_date : null,
    completed_year:
      completed && !item.completed_date ? item.completed_year : null,
    rating: completed ? item.rating : null,
    one_line_review: item.one_line_review,
  };
};
