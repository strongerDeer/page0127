import { describe, expect, it, vi } from 'vitest';

import {
  fillEvidenceProviderIds,
  missingEvidenceBookIds,
} from './fillEvidenceProviderIds';

import type { PublicTasteHistoryItem, TasteEvidence } from '../types';

const evidence = (
  book_id: string,
  extra: Partial<TasteEvidence> = {}
): TasteEvidence => ({
  book_id,
  title: `책 ${book_id}`,
  cover_image: `https://abc.supabase.co/storage/v1/object/public/book-covers/${book_id}/cover.jpg`,
  reason: '이유',
  topics: [],
  ...extra,
});

const item = (ev: TasteEvidence[] | null): PublicTasteHistoryItem =>
  ({ id: 'a1', evidence: ev }) as unknown as PublicTasteHistoryItem;

describe('fillEvidenceProviderIds', () => {
  it('옛 분석(상품번호 칸 없음)의 근거 책에 책 테이블의 번호를 붙인다', async () => {
    const lookup = vi.fn(
      async () =>
        new Map([
          ['b1', '111'],
          ['b2', null],
        ])
    );
    const [result] = await fillEvidenceProviderIds(
      [item([evidence('b1'), evidence('b2')])],
      lookup
    );
    expect(lookup).toHaveBeenCalledWith(['b1', 'b2']);
    expect(result.evidence?.map((e) => e.provider_item_id)).toEqual([
      '111',
      null,
    ]);
  });

  it('새 분석(칸이 있음, null 포함)만 있으면 조회하지 않는다', async () => {
    // 이 assertion 이 잠그는 것: 새 분석만 있는 서재는 추가 DB 왕복이 0번이어야 한다
    const lookup = vi.fn(async () => new Map());
    const items = [
      item([
        evidence('b1', { provider_item_id: '111' }),
        evidence('b2', { provider_item_id: null }),
      ]),
    ];
    expect(await fillEvidenceProviderIds(items, lookup)).toBe(items);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('조회가 비면(실패 포함) 원래 값을 그대로 돌려준다', async () => {
    const items = [item([evidence('b1')]), item(null)];
    expect(await fillEvidenceProviderIds(items, async () => new Map())).toBe(
      items
    );
  });

  it('여러 분석에 같은 책이 있어도 한 번만 묻는다', () => {
    expect(
      missingEvidenceBookIds([
        item([evidence('b1')]),
        item([evidence('b1'), evidence('b3')]),
      ])
    ).toEqual(['b1', 'b3']);
  });
});
