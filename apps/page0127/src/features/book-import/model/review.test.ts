import { describe, expect, it } from 'vitest';

import {
  countStates,
  reviewStates,
  selectedItems,
  toImportPayload,
  toReviewItems,
} from './review';

import type { ImportRow } from './types';
import type { ProviderBook } from '@/entities/book';

const book = (isbn: string, providerItemId: string | null = null) =>
  ({ isbn, providerItemId, title: isbn }) as ProviderBook;

const row = (line: number, patch: Partial<ImportRow> = {}): ImportRow => ({
  line,
  title: `책 ${line}`,
  author: null,
  isbn: null,
  status: null,
  completedDate: null,
  completedYear: null,
  rating: null,
  review: null,
  ...patch,
});

const noExisting = { isbns: [], providerItemIds: [] };

describe('reviewStates', () => {
  it('찾음·골라야 함·못 찾음을 나눈다', () => {
    const items = toReviewItems(
      [row(1), row(2), row(3)],
      [
        { candidates: [book('A')], picked: 0 },
        { candidates: [book('B'), book('C')], picked: null },
        { candidates: [], picked: null },
      ]
    );
    expect(reviewStates(items, noExisting)).toEqual([
      'ready',
      'choose',
      'notFound',
    ]);
  });

  it('이미 서재에 있는 책은 isbn 이나 상품번호로 알아본다', () => {
    const items = toReviewItems(
      [row(1), row(2)],
      [
        { candidates: [book('A')], picked: 0 },
        { candidates: [book('B', '777')], picked: 0 },
      ]
    );
    expect(
      reviewStates(items, { isbns: ['A'], providerItemIds: ['777'] })
    ).toEqual(['existing', 'existing']);
  });

  it('같은 책을 두 줄에서 고르면 아래 줄은 중복이다', () => {
    const items = toReviewItems(
      [row(1), row(2)],
      [
        { candidates: [book('A')], picked: 0 },
        { candidates: [book('A')], picked: 0 },
      ]
    );
    const states = reviewStates(items, noExisting);
    expect(states).toEqual(['ready', 'duplicate']);
    expect(countStates(states)).toMatchObject({ ready: 1, duplicate: 1 });
  });
});

describe('toImportPayload', () => {
  it('표에 적힌 상태가 먼저고, 없으면 기본 상태를 쓴다. 체크를 끈 줄은 빠진다', () => {
    const items = toReviewItems(
      [
        row(1, { status: 'reading', rating: 4 }),
        row(2, { completedDate: '2024-03-05' }),
        row(3),
      ],
      [
        { candidates: [book('A')], picked: 0 },
        { candidates: [book('B')], picked: 0 },
        { candidates: [book('C')], picked: 0 },
      ]
    );
    items[2].excluded = true;
    const chosen = selectedItems(items, reviewStates(items, noExisting));

    expect(toImportPayload(chosen, 'completed', (b) => b.isbn === 'B')).toEqual(
      [
        {
          isbn: 'A',
          status: 'reading',
          completed_date: null,
          completed_year: null,
          rating: 4,
          one_line_review: null,
          spine_ok: false,
        },
        {
          isbn: 'B',
          status: 'completed',
          completed_date: '2024-03-05',
          completed_year: null,
          rating: null,
          one_line_review: null,
          spine_ok: true,
        },
      ]
    );
  });
});
