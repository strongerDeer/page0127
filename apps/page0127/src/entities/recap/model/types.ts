import type { Book } from '@/entities/book';

/**
 * 회상 카드가 쓰는 책 한 권.
 *
 * Book 전체가 아니라 카드에 필요한 칸만 뽑는다. description·toc 같은 큰 칸을
 * 실어 나르지 않기 위해서이고, 조회 쿼리의 select 목록이 이 타입과 1:1로 맞는다.
 */
export type RecapBook = Pick<
  Book,
  | 'id'
  | 'title'
  | 'author'
  | 'cover_image'
  | 'status'
  | 'rating'
  | 'completed_date'
  | 'created_at'
>;

/** 모든 카드가 공통으로 갖는 것 — 대표 책 1권과 곁들일 나머지 */
type RecapCardBase = {
  lead: RecapBook;
  others: RecapBook[];
};

/**
 * 회상 카드 3종.
 *
 * - this-week    이번 주에 완독(completed)하거나 담은(added) 책
 * - years-ago    n년 전 기념일 언저리에 완독한 책
 * - still-reading 읽는 중인 채로 가장 오래 놓여 있는 책
 *
 * 넷째 값은 없다. 할 말이 없으면 카드 자체가 null 이다.
 */
export type RecapCard =
  | ({ kind: 'this-week'; variant: 'completed' | 'added' } & RecapCardBase)
  | ({ kind: 'years-ago'; yearsAgo: number } & RecapCardBase)
  | ({ kind: 'still-reading' } & RecapCardBase);
