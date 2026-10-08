import type { PendingBook, PendingGoal } from './types';

/**
 * 로그인 너머로 고른 책·목표를 들고 가는 임시 보관함.
 *
 * 학습 포인트:
 * - 왜 localStorage 인가: 신규 가입자는 로그인 직후 온보딩을 먼저 거치므로 주소의
 *   `next` 로 넘기면 사라지고, 검색 결과 메타데이터는 쿠키 4KB 를 넘는다.
 * - 저장소는 사용자가 조작할 수 있는 값이다 → 읽을 때 `unknown` 으로 받고 형식을 검사한다.
 * - 사파리 비공개 모드 등에서는 접근 자체가 던진다 → 모든 접근을 try/catch 로 감싼다.
 */

export const PENDING_SHELF_KEY = 'page0127:pending-shelf';
export const PENDING_SHELF_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_PENDING_BOOKS = 20;
export const GOAL_MIN = 1;
export const GOAL_MAX = 1000;

export type PendingShelf = {
  v: 1;
  savedAt: number;
  books: PendingBook[];
  goal: PendingGoal | null;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const isNullableString = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

const NULLABLE_BOOK_FIELDS = [
  'provider_item_id',
  'author',
  'publisher',
  'cover_image',
  'spine_image',
  'pub_date',
  'category',
  'source',
] as const;

const isPendingBook = (v: unknown): v is PendingBook =>
  isRecord(v) &&
  typeof v.isbn === 'string' &&
  v.isbn.length > 0 &&
  typeof v.title === 'string' &&
  NULLABLE_BOOK_FIELDS.every((key) => isNullableString(v[key]));

export const isValidGoal = (v: unknown): v is PendingGoal =>
  isRecord(v) &&
  Number.isInteger(v.year) &&
  Number.isInteger(v.target) &&
  (v.target as number) >= GOAL_MIN &&
  (v.target as number) <= GOAL_MAX;

export const parsePendingShelf = (
  raw: unknown,
  now: number
): PendingShelf | null => {
  if (!isRecord(raw) || raw.v !== 1) return null;
  if (typeof raw.savedAt !== 'number') return null;
  if (now - raw.savedAt > PENDING_SHELF_TTL_MS) return null;
  if (!Array.isArray(raw.books) || raw.books.length > MAX_PENDING_BOOKS) {
    return null;
  }
  if (!raw.books.every(isPendingBook)) return null;
  if (raw.goal !== null && !isValidGoal(raw.goal)) return null;
  // 담을 것이 하나도 없으면 보관할 이유가 없다
  if (raw.books.length === 0 && raw.goal === null) return null;

  return {
    v: 1,
    savedAt: raw.savedAt,
    books: raw.books,
    goal: raw.goal,
  };
};

export const clearPendingShelf = (): void => {
  try {
    localStorage.removeItem(PENDING_SHELF_KEY);
  } catch {
    // 저장소에 못 닿으면 지울 것도 없다
  }
};

export const readPendingShelf = (now = Date.now()): PendingShelf | null => {
  let text: string | null;
  try {
    text = localStorage.getItem(PENDING_SHELF_KEY);
  } catch {
    return null;
  }
  if (text === null) return null;

  let parsed: PendingShelf | null = null;
  try {
    parsed = parsePendingShelf(JSON.parse(text), now);
  } catch {
    parsed = null;
  }
  // 깨졌거나 만료된 값은 남겨 둘 이유가 없다
  if (!parsed) clearPendingShelf();
  return parsed;
};

export const writePendingShelf = (
  input: { books: PendingBook[]; goal: PendingGoal | null },
  now = Date.now()
): boolean => {
  const value: PendingShelf = {
    v: 1,
    savedAt: now,
    books: input.books.slice(0, MAX_PENDING_BOOKS),
    goal: input.goal,
  };
  try {
    localStorage.setItem(PENDING_SHELF_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
