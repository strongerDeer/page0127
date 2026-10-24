import type { Book } from '@/entities/book';

/** 한 번에 묻는 최대 권수 — 많으면 끝까지 매기지 않고 닫는다 */
export const RATING_NUDGE_MAX_BOOKS = 10;

export type UnratedBook = Pick<Book, 'id' | 'title' | 'author'>;

/**
 * 별점이 비어 있는 완독 책 — 맛보기로 담았거나 연도 화면에서 별점을 건너뛴 책.
 * 최근에 담은 책부터: 기억이 생생해서 바로 매길 수 있는 책을 먼저 보여 준다.
 */
export const pickUnratedCompleted = (books: Book[]): UnratedBook[] =>
  books
    .filter((b) => b.status === 'completed' && b.rating === null)
    // filter 가 새 배열을 만들어 sort 가 원본(props)을 건드리지 않는다
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(({ id, title, author }) => ({ id, title, author }));

export type RatingNudge = {
  /** 취향 분석까지 남은 권수 */
  needed: number;
  /** 별점만 남기면 되는 완독 책 권수 */
  unratedCount: number;
};

/**
 * 서재 주인에게 "별점만 남기면 돼요"를 보여 줄지.
 * 취향 분석이 아직 잠겨 있고, 별점만 남기면 채울 수 있는 책이 있을 때만 — 이미 열렸으면
 * 별점을 조를 이유가 없고, 별점 없는 책이 없으면 할 수 있는 게 책 추가뿐이다.
 */
export const toRatingNudge = ({
  analyzableCount,
  unratedCount,
  minBooks,
}: {
  analyzableCount: number;
  unratedCount: number;
  minBooks: number;
}): RatingNudge | null => {
  const needed = minBooks - analyzableCount;
  if (needed <= 0 || unratedCount === 0) return null;
  return { needed, unratedCount };
};

/** 잠긴 취향 분석 버튼을 눌렀을 때 — 별점만 남기면 되는 책이 있으면 그 길을 알려 준다 */
export const toLockedAnalysisMessage = (
  nudge: RatingNudge | null,
  fallback: string
): string => {
  if (!nudge) return fallback;
  return nudge.unratedCount >= nudge.needed
    ? `완독 책 ${nudge.needed}권에 별점만 남기면 바로 취향 분석을 볼 수 있어요.`
    : `별점 없는 완독 책 ${nudge.unratedCount}권에 별점을 남기고, ${nudge.needed - nudge.unratedCount}권을 더 읽으면 취향 분석을 볼 수 있어요.`;
};
