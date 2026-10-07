/** 소개 페이지에서 쓰는 책 한 권 — 실제 global_books 에서 표지·책등만 가져온다 */
export type ShelfBook = {
  id: string;
  title: string;
  coverImage: string | null;
  /** coverImage(YES24)를 못 불러왔을 때 쓸 Storage 사본 */
  coverFallback?: string | null;
  spineImage: string | null;
};

/** 띠를 그릴 최소 권수. 이보다 적으면 같은 표지가 눈에 띄게 반복된다 */
export const MIN_MARQUEE_COVERS = 8;

/** 표지가 있는 책만 최근 순서대로 두 줄로 나눈다. 모자라면 띠를 숨긴다(null) */
export const splitCoverRows = (
  books: ShelfBook[]
): [ShelfBook[], ShelfBook[]] | null => {
  const withCover = books.filter((b) => b.coverImage);
  if (withCover.length < MIN_MARQUEE_COVERS) return null;

  const half = Math.ceil(withCover.length / 2);
  return [withCover.slice(0, half), withCover.slice(half)];
};
