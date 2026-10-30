import { missingSpineCandidate } from '@/shared/lib/spineImage';

import type { Book } from '@/entities/book';

/** 한 번 서재를 열 때 다시 확인하는 최대 권수 — 서재가 커도 요청이 몰리지 않게 */
export const SPINE_REPAIR_BATCH = 5;

/**
 * 확인했는데 YES24 에도 책등이 없던 책은 이 기간 동안 다시 보지 않는다.
 * (책 먹는 법처럼 원래 없는 책을 서재를 열 때마다 확인하지 않으려는 것)
 */
export const SPINE_REPAIR_RETRY_MS = 7 * 24 * 60 * 60 * 1000;

/** 책 id → 마지막으로 확인한 시각(ms) */
export type SpineRepairLog = Record<string, number>;

/**
 * 이번에 다시 확인할 책을 고른다.
 *
 * 책등이 비어 있는 YES24 책 중, 최근에 확인해 보지 않은 것만 앞에서부터 몇 권.
 */
export const pickSpineRepairTargets = (
  books: Pick<Book, 'id' | 'spine_image' | 'source' | 'provider_item_id'>[],
  log: SpineRepairLog,
  now: number
) =>
  books
    .filter((book) => missingSpineCandidate(book) !== null)
    .filter((book) => {
      const triedAt = log[book.id];
      return triedAt === undefined || now - triedAt >= SPINE_REPAIR_RETRY_MS;
    })
    .slice(0, SPINE_REPAIR_BATCH);

/** 오래된 기록은 버린다 — 저장소가 끝없이 커지지 않게 */
export const pruneSpineRepairLog = (
  log: SpineRepairLog,
  now: number
): SpineRepairLog =>
  Object.fromEntries(
    Object.entries(log).filter(
      ([, triedAt]) => now - triedAt < SPINE_REPAIR_RETRY_MS
    )
  );
