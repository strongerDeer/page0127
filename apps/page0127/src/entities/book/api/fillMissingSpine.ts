import {
  missingSpineCandidate,
  resolveSpineImageUrl,
} from '@/shared/lib/spineImage';

import { bookApi } from './bookApi';

import type { Book } from '../types';

/**
 * 뒤에서 확인할 때의 기다림 한도.
 *
 * 책등 원본은 세로 1200px 라 PC 와이파이에서는 0.1초 안팎이지만 모바일 데이터에서는
 * 3초(resolveSpineImageUrl 기본값)를 넘기기 쉽다 — 베타 사용자가 폰으로 등록한 책들이
 * 그렇게 책등 없이 저장됐다(2026-10-31). 사용자를 기다리게 하는 자리가 아니므로 넉넉히 둔다.
 */
export const BACKGROUND_SPINE_TIMEOUT_MS = 10_000;

/**
 * 책등이 비어 있는 YES24 책이면 책등을 확인해 채운다. 채웠으면 true.
 *
 * 화면을 막지 않도록 결과를 기다리지 않고 부른다(`void fillMissingSpine(book)`).
 * 확인에 실패하면 그냥 비워 둔다 — 글자 책등이 남을 뿐 담긴 책은 그대로다.
 * 채우면 books 트리거가 전체 도서(global_books)의 빈 책등도 같이 채운다
 * (20261027000000_sync_global_spine_image) → 다음에 담는 사람은 처음부터 책등을 받는다.
 */
export const fillMissingSpine = async (
  book: Pick<Book, 'id' | 'spine_image' | 'source' | 'provider_item_id'>,
  timeout: number = BACKGROUND_SPINE_TIMEOUT_MS
): Promise<boolean> => {
  const candidate = missingSpineCandidate(book);
  if (!candidate) return false;
  try {
    const spineImage = await resolveSpineImageUrl(candidate, timeout);
    if (!spineImage) return false;
    await bookApi.updateBook(book.id, { spine_image: spineImage });
    return true;
  } catch {
    // 책등은 꾸밈이다 — 실패해도 사용자에게 알릴 일은 아니다
    return false;
  }
};
