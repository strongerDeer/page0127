import {
  missingSpineCandidate,
  resolveSpineImageUrl,
} from '@/shared/lib/spineImage';

import { bookApi } from './bookApi';

import type { Book } from '../types';

/**
 * 방금 담은 책의 책등이 비어 있으면 YES24 에서 확인해 채운다.
 *
 * 담기를 막지 않도록 결과를 기다리지 않고 부른다(`void fillMissingSpine(book)`).
 * 확인에 실패하면 그냥 비워 둔다 — 회색 칸이 남을 뿐 담긴 책은 그대로다.
 * 채우면 books 트리거가 전체 도서(global_books)의 빈 책등도 같이 채운다
 * (20261027000000_sync_global_spine_image) → 다음에 담는 사람은 처음부터 책등을 받는다.
 */
export const fillMissingSpine = async (
  book: Pick<Book, 'id' | 'spine_image' | 'source' | 'provider_item_id'>
): Promise<void> => {
  const candidate = missingSpineCandidate(book);
  if (!candidate) return;
  try {
    const spineImage = await resolveSpineImageUrl(candidate);
    if (spineImage)
      await bookApi.updateBook(book.id, { spine_image: spineImage });
  } catch {
    // 책등은 꾸밈이다 — 실패해도 사용자에게 알릴 일은 아니다
  }
};
