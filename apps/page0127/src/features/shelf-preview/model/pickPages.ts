import type { ShelfPick } from './types';

/** 한 번에 보여 주는 권수 — 4열 × 2줄 */
export const PICKS_PER_PAGE = 8;

/**
 * 맛보기 책을 묶음으로 나눈다. [다른 책 보기]가 묶음을 차례로 넘긴다.
 * 첫 묶음에서 아는 책을 못 찾은 방문자에게 두 번째 기회를 주되,
 * 한 화면은 8권으로 가볍게 유지한다.
 */
export const toPickPages = (picks: ShelfPick[]): ShelfPick[][] => {
  const pages: ShelfPick[][] = [];
  for (let i = 0; i < picks.length; i += PICKS_PER_PAGE) {
    pages.push(picks.slice(i, i + PICKS_PER_PAGE));
  }
  return pages;
};
