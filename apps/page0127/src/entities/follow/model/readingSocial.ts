import { mapToMainCategory } from '@/shared/lib/categoryMapper';

export type TasteClash = {
  mineBookId: string;
  otherBookId: string;
  otherUserId: string;
  title: string;
  author: string | null;
  coverImage: string | null;
  providerItemId: string | null;
  isbn: string;
  mineRating: number;
  otherRating: number;
};
export type ReadingSocial = {
  year: number;
  genres: { userId: string; categories: string[] }[];
  clashes: TasteClash[];
};

/** 서재와 같은 대분류를 쓴다. 분류를 모르는 '기타'로 점수를 얻지는 않는다. */
export const countReadingGenres = (categories: string[]): string[] =>
  [...new Set(categories.filter((c) => c.trim()).map(mapToMainCategory))]
    .filter((c) => c !== '기타')
    .sort();

export const parseReadingSocial = (
  value: unknown,
  currentUserId: string
): ReadingSocial => {
  const bad = () => {
    throw new Error('독서 비교 기록을 확인할 수 없습니다.');
  };
  if (!value || typeof value !== 'object') return bad();
  const data = value as Record<string, unknown>;
  if (
    !Number.isInteger(data.year) ||
    !Array.isArray(data.genres) ||
    !Array.isArray(data.clashes)
  )
    return bad();
  const genres = data.genres.map((item: Record<string, unknown>) => {
    if (
      !item ||
      typeof item.user_id !== 'string' ||
      !Array.isArray(item.categories) ||
      !item.categories.every((c) => typeof c === 'string')
    )
      return bad();
    return {
      userId: item.user_id,
      categories: countReadingGenres(item.categories as string[]),
    };
  });
  if (
    !genres.some((g) => g.userId === currentUserId) ||
    new Set(genres.map((g) => g.userId)).size !== genres.length
  )
    return bad();
  const text = (v: unknown) => (typeof v === 'string' ? v : bad());
  const nullable = (v: unknown) => (v === null ? null : text(v));
  const rating = (v: unknown) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5
      ? v
      : bad();
  const clashes = data.clashes.map(
    (item: Record<string, unknown>): TasteClash => ({
      mineBookId: text(item.mine_book_id),
      otherBookId: text(item.other_book_id),
      otherUserId: text(item.other_user_id),
      title: text(item.title),
      author: nullable(item.author),
      coverImage: nullable(item.cover_image),
      providerItemId: nullable(item.provider_item_id),
      isbn: text(item.isbn),
      mineRating: rating(item.mine_rating),
      otherRating: rating(item.other_rating),
    })
  );
  return { year: data.year as number, genres, clashes };
};
