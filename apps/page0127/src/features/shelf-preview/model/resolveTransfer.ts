import type { ShelfTransfer } from './loginTransfer';
import type { PendingShelf } from './pendingShelf';
import type { PendingBook } from './types';

export type TransferResult = {
  pending: PendingShelf | null;
  failed: number;
  selection?: ShelfTransfer;
};

/** 같은 브라우저에는 원본 정보가 이미 있다. 재조회 실패로 그 선택을 덮어쓰지 않는다. */
export const preferLocalSelection = (
  result: TransferResult,
  local: PendingShelf | null
): TransferResult => {
  const selection = result.selection;
  if (!local || !selection || local.books.length !== selection.books.length)
    return result;
  const same =
    selection.books.every((ref, i) => {
      const book = local.books[i];
      return (
        ref.isbn === book.isbn &&
        ref.providerItemId === book.provider_item_id &&
        ref.wish === (book.status === 'want_to_read')
      );
    }) &&
    (local.lifeBookIsbn ?? null) === (selection.lifeBookIsbn ?? null) &&
    (local.goal?.year ?? null) === (selection.goal?.year ?? null) &&
    (local.goal?.target ?? null) === (selection.goal?.target ?? null);
  return same ? { ...result, pending: local, failed: 0 } : result;
};

/** 원본 메타데이터는 공개 도서에서만 읽는다. 한 권 실패가 나머지 선택을 없애지 않는다. */
export const resolveTransfer = async (
  transfer: ShelfTransfer,
  lookup: (book: ShelfTransfer['books'][number]) => Promise<PendingBook | null>
): Promise<TransferResult> => {
  const books: PendingBook[] = [];
  let failed = 0;
  for (const ref of transfer.books) {
    try {
      const book = await lookup(ref);
      if (!book) {
        failed++;
        continue;
      }
      books.push({ ...book, status: ref.wish ? 'want_to_read' : 'completed' });
    } catch {
      failed++;
    }
  }
  const lifeRef = transfer.books.find((b) => b.isbn === transfer.lifeBookIsbn);
  const life =
    lifeRef &&
    books.find(
      (b) =>
        b.isbn === lifeRef.isbn ||
        (lifeRef.providerItemId !== null &&
          b.provider_item_id === lifeRef.providerItemId)
    );
  return {
    selection: transfer,
    pending:
      books.length > 0 || transfer.goal
        ? {
            v: 1,
            savedAt: transfer.savedAt,
            books,
            goal: transfer.goal,
            ...(life && { lifeBookIsbn: life.isbn }),
          }
        : null,
    failed,
  };
};
