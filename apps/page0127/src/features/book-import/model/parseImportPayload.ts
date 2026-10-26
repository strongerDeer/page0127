import type { ImportBookPayload } from './types';
import type { BookStatus } from '@/entities/book';

const STATUSES: readonly BookStatus[] = [
  'want_to_read',
  'reading',
  'completed',
];
const REVIEW_MAX_LENGTH = 300;

/**
 * 등록 API 본문을 검사한다. 하나라도 모양이 틀리면 `null` (400) — 화면이 만든 값이라
 * 틀렸다면 버그이고, 반쯤 담는 것보다 통째로 거절하는 편이 원인을 찾기 쉽다.
 *
 * 같은 ISBN 이 두 번 오면 앞의 것만 남긴다 (표에 같은 책을 두 줄 적은 경우).
 */
export const parseImportPayload = (
  value: unknown,
  max: number
): ImportBookPayload[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) {
    return null;
  }

  const seen = new Set<string>();
  const books: ImportBookPayload[] = [];
  for (const raw of value) {
    const item = parseItem(raw);
    if (!item) return null;
    if (seen.has(item.isbn)) continue;
    seen.add(item.isbn);
    books.push(item);
  }
  return books;
};

const parseItem = (raw: unknown): ImportBookPayload | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const v = raw as Record<string, unknown>;

  if (typeof v.isbn !== 'string' || !/^97[89]\d{10}$/.test(v.isbn)) return null;
  if (!STATUSES.includes(v.status as BookStatus)) return null;

  const date = v.completed_date ?? null;
  if (
    date !== null &&
    (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
  ) {
    return null;
  }
  const year = v.completed_year ?? null;
  if (
    year !== null &&
    (!Number.isInteger(year) ||
      (year as number) < 1900 ||
      (year as number) > 2100)
  ) {
    return null;
  }
  const rating = v.rating ?? null;
  if (rating !== null && ![1, 2, 3, 4, 5].includes(rating as number))
    return null;
  const review = v.one_line_review ?? null;
  if (review !== null && typeof review !== 'string') return null;

  return {
    isbn: v.isbn,
    status: v.status as BookStatus,
    completed_date: date as string | null,
    completed_year: year as number | null,
    rating: rating as ImportBookPayload['rating'],
    one_line_review: review
      ? (review as string).slice(0, REVIEW_MAX_LENGTH) || null
      : null,
    spine_ok: v.spine_ok === true,
  };
};
