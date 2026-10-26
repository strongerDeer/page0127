import type {
  ImportBookPayload,
  ImportRow,
  MatchResponse,
  MatchResult,
} from './types';
import type { BookStatus, ProviderBook } from '@/entities/book';

/**
 * 확인 화면 한 줄의 상태.
 *
 * - ready: 책을 찾았고 담을 수 있다
 * - choose: 후보는 있는데 어느 책인지 확신이 없다 → 사용자가 고른다
 * - notFound: 후보가 없다
 * - existing: 이미 서재에 있다 (재독은 한 권 등록에서)
 * - duplicate: 위 줄에서 같은 책을 이미 골랐다
 */
export type ReviewState =
  'ready' | 'choose' | 'notFound' | 'existing' | 'duplicate';

export type ReviewItem = {
  row: ImportRow;
  candidates: ProviderBook[];
  picked: number | null;
  /** 사용자가 체크를 끈 줄. ready 인 줄만 의미가 있다 */
  excluded: boolean;
};

export const toReviewItems = (
  rows: ImportRow[],
  results: MatchResult[]
): ReviewItem[] =>
  rows.map((row, i) => ({
    row,
    candidates: results[i]?.candidates ?? [],
    picked: results[i]?.picked ?? null,
    excluded: false,
  }));

export const pickedBook = (item: ReviewItem): ProviderBook | null =>
  item.picked === null ? null : (item.candidates[item.picked] ?? null);

const isExisting = (book: ProviderBook, existing: MatchResponse['existing']) =>
  existing.isbns.includes(book.isbn) ||
  (book.providerItemId !== null &&
    existing.providerItemIds.includes(book.providerItemId));

/** 줄마다 상태를 매긴다. 같은 책이 두 번 골라졌으면 위 줄이 이긴다 */
export const reviewStates = (
  items: ReviewItem[],
  existing: MatchResponse['existing']
): ReviewState[] => {
  const taken = new Set<string>();
  return items.map((item) => {
    if (item.candidates.length === 0) return 'notFound';
    const book = pickedBook(item);
    if (!book) return 'choose';
    if (isExisting(book, existing)) return 'existing';
    if (taken.has(book.isbn)) return 'duplicate';
    taken.add(book.isbn);
    return 'ready';
  });
};

/** 실제로 담을 줄 — ready 이면서 체크를 끄지 않은 것 */
export const selectedItems = (
  items: ReviewItem[],
  states: ReviewState[]
): ReviewItem[] =>
  items.filter((item, i) => states[i] === 'ready' && !item.excluded);

/**
 * 등록 API 본문을 만든다.
 *
 * 상태는 표에 적힌 것이 먼저고, 없으면 확인 화면에서 고른 기본 상태다.
 * 날짜·별점은 그대로 보내고 "완독일 때만 남긴다"는 판단은 서버가 한다 — 규칙을 한 곳에 둔다.
 */
export const toImportPayload = (
  items: ReviewItem[],
  defaultStatus: BookStatus,
  spineOk: (book: ProviderBook) => boolean
): ImportBookPayload[] =>
  items.flatMap((item) => {
    const book = pickedBook(item);
    if (!book) return [];
    return [
      {
        isbn: book.isbn,
        status: item.row.status ?? defaultStatus,
        completed_date: item.row.completedDate,
        completed_year: item.row.completedYear,
        rating: item.row.rating,
        one_line_review: item.row.review,
        spine_ok: spineOk(book),
      },
    ];
  });

/** 맨 위 요약 숫자 */
export const countStates = (states: ReviewState[]) =>
  states.reduce((acc, s) => ({ ...acc, [s]: acc[s] + 1 }), {
    ready: 0,
    choose: 0,
    notFound: 0,
    existing: 0,
    duplicate: 0,
  } as Record<ReviewState, number>);
