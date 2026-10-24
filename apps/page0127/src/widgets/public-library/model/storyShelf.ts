import { getCompletedYear, isTopRated } from '@/entities/book';
import { spineWidthPx } from '@/entities/book/model/spineWidth';

import type { PublicShelfBook } from '@/entities/book/api/getPublicShelfSummary';
import type { StoryShelfItem } from '@/shared/lib/og/StoryCard';

/**
 * 스토리 이미지 책장에 넘기는 최대 권수.
 * 2단에 다 안 들어가는 책은 어차피 잘려 보이지 않는데, 넘긴 만큼 이미지를 받아 와야 해서
 * 그리는 시간이 늘어난다. 책등 평균 폭(≈15px)으로 2단을 채우고도 남는 수로 묶는다.
 */
export const STORY_SHELF_MAX_BOOKS = 40;

/** 이보다 적으면 책장이 비어 보인다 — 표지 일렬로 대신한다 */
export const STORY_SHELF_MIN_BOOKS = 5;

/**
 * 스토리 책장에 세울 책. 숫자 한 줄과 같은 책을 세운다 —
 * "2026년에 완독한 책 15권" 아래에는 그 15권이, "지금까지 꽂은 책" 아래에는 최근 책이 선다.
 *
 * @returns 세울 책이 STORY_SHELF_MIN_BOOKS 보다 적으면 null (표지 일렬로 대신한다)
 */
export const toStoryShelf = (
  books: PublicShelfBook[],
  { year, onlyThisYear }: { year: number; onlyThisYear: boolean }
): StoryShelfItem[] | null => {
  const pool = onlyThisYear
    ? books.filter((book) => getCompletedYear(book) === year)
    : books;
  if (pool.length < STORY_SHELF_MIN_BOOKS) return null;

  return pool.slice(0, STORY_SHELF_MAX_BOOKS).map((book) => {
    if (isTopRated(book.rating, book.is_life_book)) {
      return {
        kind: 'cover',
        key: book.id,
        title: book.title,
        src: book.cover_image,
      };
    }
    // 두께 폭 — 책등 이미지가 없거나 받지 못했을 때 글자 책등으로 세우는 폭
    const width = spineWidthPx(book.thickness_mm);
    if (book.spine_image) {
      return {
        kind: 'spine',
        key: book.id,
        title: book.title,
        src: book.spine_image,
        // 실제 비율은 라우트가 이미지를 받아 채운다(resolveStoryShelf)
        ratio: null,
        fallbackWidth: width,
      };
    }
    return { kind: 'plain', key: book.id, title: book.title, width };
  });
};
