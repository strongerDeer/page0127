import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import {
  pickSpineRepairTargets,
  pruneSpineRepairLog,
  SPINE_REPAIR_BATCH,
  SPINE_REPAIR_RETRY_MS,
} from './spineRepair';

const NOW = 1_800_000_000_000;

const yes24 = (id: string, spine: string | null = null) =>
  createTestBook({
    id,
    source: 'yes24',
    provider_item_id: `item-${id}`,
    spine_image: spine,
  });

describe('pickSpineRepairTargets', () => {
  it('책등이 빈 YES24 책만 고른다', () => {
    const books = [
      yes24('a'),
      yes24('b', 'https://image.yes24.com/goods/1/SIDE/XL'),
      createTestBook({ id: 'c', source: 'manual', spine_image: null }),
    ];
    expect(pickSpineRepairTargets(books, {}, NOW).map((b) => b.id)).toEqual([
      'a',
    ]);
  });

  it('최근에 확인한 책은 건너뛰고, 기간이 지나면 다시 본다', () => {
    const books = [yes24('a'), yes24('b')];
    const log = { a: NOW - 1000, b: NOW - SPINE_REPAIR_RETRY_MS };
    expect(pickSpineRepairTargets(books, log, NOW).map((b) => b.id)).toEqual([
      'b',
    ]);
  });

  it('한 번에 정해진 권수까지만 고른다', () => {
    const books = Array.from({ length: 20 }, (_, i) => yes24(`b${i}`));
    expect(pickSpineRepairTargets(books, {}, NOW)).toHaveLength(
      SPINE_REPAIR_BATCH
    );
  });
});

describe('pruneSpineRepairLog', () => {
  it('기간이 지난 기록은 버린다', () => {
    const log = { old: NOW - SPINE_REPAIR_RETRY_MS, fresh: NOW - 1000 };
    expect(pruneSpineRepairLog(log, NOW)).toEqual({ fresh: NOW - 1000 });
  });
});
