import { toSafeRedirect } from '@/shared/lib/auth/safeRedirect';

import {
  isValidGoal,
  MAX_PENDING_BOOKS,
  PENDING_SHELF_TTL_MS,
} from './pendingShelf';

import type { PendingShelfInput } from './pendingShelf';
import type { PendingGoal } from './types';

export const SHELF_TRANSFER_PARAM = 'shelf';
const MAX_TOKEN_LENGTH = 4096;
const IDENTIFIER = /^[a-zA-Z0-9_-]{1,64}$/;

export type ShelfTransfer = {
  savedAt: number;
  books: { isbn: string; providerItemId: string | null; wish: boolean }[];
  goal: PendingGoal | null;
  lifeBookIsbn?: string;
};

/** 책 식별자·목표만 전달한다. 계정·메모·평가·이미지 주소는 링크에 넣지 않는다. */
export const encodeShelfTransfer = (
  input: PendingShelfInput,
  now = Date.now()
): string => {
  const value = [
    1,
    now,
    input.books.map((b) => [
      b.isbn,
      b.provider_item_id,
      b.status === 'want_to_read',
    ]),
    input.goal ? [input.goal.year, input.goal.target] : null,
    input.lifeBookIsbn ?? null,
  ];
  const token = btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  if (!parseShelfTransfer(token, now))
    throw new Error('선택한 책 정보를 전달할 수 없습니다.');
  return token;
};

export const parseShelfTransfer = (
  token: string | undefined,
  now = Date.now()
): ShelfTransfer | null => {
  if (
    typeof token !== 'string' ||
    !token ||
    token.length > MAX_TOKEN_LENGTH ||
    !/^[\w-]+$/.test(token)
  )
    return null;
  try {
    const value: unknown = JSON.parse(
      atob(token.replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (!Array.isArray(value) || value.length !== 5) return null;
    const [version, savedAt, books, rawGoal, life] = value;
    if (
      version !== 1 ||
      typeof savedAt !== 'number' ||
      !Number.isFinite(savedAt) ||
      savedAt > now + 60_000 ||
      now - savedAt > PENDING_SHELF_TTL_MS
    )
      return null;
    if (
      !Array.isArray(books) ||
      books.length > MAX_PENDING_BOOKS ||
      !books.every(
        (b: unknown) =>
          Array.isArray(b) &&
          b.length === 3 &&
          typeof b[0] === 'string' &&
          IDENTIFIER.test(b[0]) &&
          (b[1] === null ||
            (typeof b[1] === 'string' && IDENTIFIER.test(b[1]))) &&
          typeof b[2] === 'boolean'
      )
    )
      return null;
    const goal =
      Array.isArray(rawGoal) && rawGoal.length === 2
        ? { year: rawGoal[0], target: rawGoal[1] }
        : null;
    if (rawGoal !== null && !isValidGoal(goal)) return null;
    if (books.length === 0 && goal === null) return null;
    if (
      life !== null &&
      (typeof life !== 'string' || !books.some((b) => b[0] === life))
    )
      return null;
    return {
      savedAt,
      books: books.map(([isbn, providerItemId, wish]) => ({
        isbn,
        providerItemId,
        wish,
      })),
      goal,
      ...(life !== null && { lifeBookIsbn: life }),
    };
  } catch {
    return null;
  }
};

export const toPendingLoginPath = (
  input: PendingShelfInput,
  next?: string,
  now = Date.now()
): string => {
  const params = new URLSearchParams({
    [SHELF_TRANSFER_PARAM]: encodeShelfTransfer(input, now),
  });
  const safeNext = toSafeRedirect(next);
  if (safeNext) params.set('redirect', safeNext);
  return `/login?${params}`;
};
