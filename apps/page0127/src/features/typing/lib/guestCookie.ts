/** 비회원 필사 쿠키 — 무작위 id(httpOnly). 랭킹에서 "(나)" 표시와 1인 1줄에 쓴다 */
export const GUEST_COOKIE = 'p0127_typing_guest';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isGuestId = (value: unknown): value is string =>
  typeof value === 'string' && UUID.test(value);
