import { mapToMainCategory } from '@/shared/lib/categoryMapper';

import {
  badgeLevels,
  badgeUnit,
  bookKey,
  byReadOrder,
  CATEGORY_BADGES,
  normalizeAuthor,
} from './badges';
import { isClassicBook } from './isClassicBook';

import type { Badge, BadgeInput } from './badges';
import type { Book } from '@/entities/book';

export type BadgeEvidence = {
  title: string;
  unit: string;
  milestone: { count: number; label: string } | null;
  books: {
    id: string;
    title: string;
    author: string | null;
    completedAt: string | null;
    detail?: string;
  }[];
};

const distinctBooks = (books: Book[]) => {
  const seen = new Set<string>();
  return books.filter((book) => {
    const key = bookKey(book);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** 배지 계산과 같은 공개 기록을 읽은 순서로 보여 준다. */
export const getBadgeEvidence = (
  badge: Badge,
  { books, readingGoal }: Pick<BadgeInput, 'books' | 'readingGoal'>
): BadgeEvidence | undefined => {
  if (badge.kind === 'hidden' && !badge.earned) return undefined;
  const completed = books
    .filter((book) => book.is_public && book.status === 'completed')
    .sort(byReadOrder);
  let matching: Book[];
  let title = '집계된 책';
  let unit = '권';
  let milestone = badge.earned
    ? badgeLevels(badge.id)[badge.level - 1]
    : undefined;
  const category = CATEGORY_BADGES.find((item) => item.id === badge.id);

  if (badge.id === 'shelf') {
    matching = distinctBooks(completed);
    title = '집계된 완독 책';
  } else if (badge.id === 'classics') {
    matching = distinctBooks(completed.filter(isClassicBook));
    title = '집계된 고전';
  } else if (category) {
    matching = distinctBooks(
      completed.filter(
        (book) => mapToMainCategory(book.category) === category.category
      )
    );
    title = `${category.category} 분야의 책`;
  } else if (badge.id === 'wide-view') {
    const seen = new Set<string>();
    matching = completed.filter((book) => {
      const field = mapToMainCategory(book.category);
      if (field === '기타' || seen.has(field)) return false;
      seen.add(field);
      return true;
    });
    title = '집계된 분야와 대표 책';
    unit = '분야';
  } else if (badge.id === 'author-fan') {
    const groups = new Map<string, Book[]>();
    for (const book of distinctBooks(completed)) {
      const author = normalizeAuthor(book.author);
      if (author) groups.set(author, [...(groups.get(author) ?? []), book]);
    }
    const earnedAuthor = normalizeAuthor(
      completed.find((book) => book.id === badge.book?.id)?.author ?? null
    );
    matching =
      (earnedAuthor
        ? groups.get(earnedAuthor)
        : [...groups.values()].sort((a, b) => b.length - a.length)[0]) ?? [];
    title = '같은 작가의 책';
    milestone = badge.earned ? 3 : undefined;
  } else if (badge.id === 'critic') {
    matching = completed.filter((book) => book.one_line_review?.trim());
    title = '집계된 한줄평 기록';
    unit = '개';
    milestone = badge.earned ? 10 : undefined;
  } else if (badge.id === 'goal-kept' && readingGoal) {
    matching = distinctBooks(
      completed.filter((book) =>
        book.completed_date?.startsWith(`${readingGoal.year}-`)
      )
    );
    title = `${readingGoal.year}년 목표에 포함된 책`;
    milestone = badge.earned ? readingGoal.target : undefined;
  } else if (badge.id === 'double-finish' && badge.book) {
    const date = completed.find(
      (book) => book.id === badge.book?.id
    )?.completed_date;
    matching = date
      ? distinctBooks(completed.filter((book) => book.completed_date === date))
      : [];
    title = '같은 날 완독한 책';
    milestone = badge.earned ? 2 : undefined;
  } else {
    return undefined;
  }

  if (!matching.length) return undefined;
  return {
    title,
    unit,
    milestone:
      milestone && milestone <= matching.length
        ? { count: milestone, label: `${milestone}${badgeUnit(badge.id)}` }
        : null,
    books: matching.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      completedAt: book.completed_date,
      ...(badge.id === 'wide-view'
        ? { detail: mapToMainCategory(book.category) }
        : {}),
    })),
  };
};
