import type { Book, GlobalBook } from '@/entities/book';

/**
 * 책 목록에서 책을 눌렀을 때 갈 주소.
 *
 * - 서점 책: 공용 책 정보 페이지 /books/info/[id] (CDN 캐시)
 * - 직접 등록 책: 내 서재의 그 책으로 보내는 /books/mine/[id]
 *   캐시되는 책 정보 페이지는 누가 보는지 몰라 "등록한 사람에게만" 규칙을 못 지킨다 → 거기선 404.
 *   목록에 직접 등록 책이 보이는 사람은 등록한 본인뿐이다(catalogVisibilityFilter).
 *   (HJ M1 결정, 2026-11-11)
 */
export const bookInfoHref = (
  book: Pick<GlobalBook | Book, 'id' | 'source'>
): string =>
  book.source === 'manual'
    ? `/books/mine/${book.id}`
    : `/books/info/${book.id}`;
