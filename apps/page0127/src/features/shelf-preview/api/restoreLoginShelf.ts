import { getBookProvider } from '@/shared/api/book-provider';
import { createAnonClient } from '@/shared/config/supabase/anon';

import { parseShelfTransfer } from '../model/loginTransfer';
import { resolveTransfer } from '../model/resolveTransfer';
import { fromProviderBook } from '../model/toShelfPick';

import type { TransferResult } from '../model/resolveTransfer';
import type { PendingBook } from '../model/types';

import 'server-only';

export const restoreLoginShelf = async (
  token?: string
): Promise<TransferResult | null> => {
  if (!token) return null;
  const transfer = parseShelfTransfer(token);
  if (!transfer) return { pending: null, failed: 1 };
  if (transfer.books.length === 0)
    return resolveTransfer(transfer, async () => null);
  // 공개 카탈로그에서 먼저 모아 읽는다. 사용자의 기록 테이블에는 접근하지 않는다.
  const supabase = createAnonClient();
  const columns =
    'isbn,provider_item_id,title,author,publisher,cover_image,spine_image,pub_date,category,source';
  const isbns = transfer.books.map((b) => b.isbn);
  const ids = transfer.books.flatMap((b) =>
    b.providerItemId ? [b.providerItemId] : []
  );
  const results = await Promise.all([
    isbns.length
      ? supabase.from('global_books').select(columns).in('isbn', isbns)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase
          .from('global_books')
          .select(columns)
          .in('provider_item_id', ids)
      : Promise.resolve({ data: [] }),
  ]);
  const rows = results.flatMap((r) => r.data ?? []) as PendingBook[];
  return resolveTransfer(transfer, async (ref) => {
    const found =
      rows.find((row) => row.isbn === ref.isbn) ??
      rows.find(
        (row) =>
          ref.providerItemId !== null &&
          row.provider_item_id === ref.providerItemId
      );
    if (found) return found;
    // 검색으로 고른 책은 카탈로그에 없을 수 있다. ISBN만 공급자에 보내고 메타데이터를 다시 받는다.
    if (!/^\d{10}(\d{3})?$/.test(ref.isbn)) return null;
    const book = await getBookProvider().getByIsbn(ref.isbn);
    return book ? fromProviderBook(book).book : null;
  });
};
