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
  /**
   * 홈 히어로 B("당신의 인생책은?")에서 찾은 인생책. books 안에 있는 isbn 이다.
   * 버전을 올리지 않고 선택 필드로 더했다 — 올리면 배포 순간 남아 있던 보관분이 전부 깨진다.
   */
  lifeBookIsbn?: string;
};

/** 인생책 표시는 그 책이 보관분 안에 있을 때만 남긴다 — 없는 책을 가리키면 버린다 */
const pickLifeBookIsbn = (
  value: unknown,
  books: PendingBook[]
): { lifeBookIsbn?: string } =>
  typeof value === 'string' && books.some((b) => b.isbn === value)
    ? { lifeBookIsbn: value }
    : {};

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

const validCompletion = (value: unknown): boolean => {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return (
    (value.completedDate === null ||
      (typeof value.completedDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(value.completedDate))) &&
    (value.completedYear === null ||
      (Number.isInteger(value.completedYear) &&
        Number(value.completedYear) >= 1800 &&
        Number(value.completedYear) <= 9999)) &&
    !(value.completedDate && value.completedYear) &&
    (value.rating === null ||
      (Number.isInteger(value.rating) &&
        Number(value.rating) >= 0 &&
        Number(value.rating) <= 5)) &&
    (value.isLifeBook === undefined || typeof value.isLifeBook === 'boolean') &&
    typeof value.isPublic === 'boolean'
  );
};

const isPendingBook = (v: unknown): v is PendingBook =>
  isRecord(v) &&
  typeof v.isbn === 'string' &&
  v.isbn.length > 0 &&
  typeof v.title === 'string' &&
  validCompletion(v.completion) &&
  (v.status === undefined ||
    v.status === 'completed' ||
    v.status === 'want_to_read') &&
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
    // 이상한 값이어도 보관분 전체를 버리지 않는다 — 인생책 표시만 떨군다
    ...pickLifeBookIsbn(raw.lifeBookIsbn, raw.books),
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

export type PendingShelfInput = {
  books: PendingBook[];
  goal: PendingGoal | null;
  lifeBookIsbn?: string;
};

export const writePendingShelf = (
  input: PendingShelfInput,
  now = Date.now()
): boolean => {
  const books = input.books.slice(0, MAX_PENDING_BOOKS);
  const value: PendingShelf = {
    v: 1,
    savedAt: now,
    books,
    goal: input.goal,
    ...pickLifeBookIsbn(input.lifeBookIsbn, books),
  };
  try {
    localStorage.setItem(PENDING_SHELF_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
