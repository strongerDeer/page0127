import { describe, expect, it } from 'vitest';

import { toShelfPreviewMessage } from './previewMessage';

describe('toShelfPreviewMessage', () => {
  it('0권이면 문구가 없다(목표 흐름이 대신한다)', () => {
    expect(toShelfPreviewMessage(0)).toBeNull();
  });

  it('1~4권은 남은 권수를 말한다', () => {
    expect(toShelfPreviewMessage(1)).toBe(
      '4권만 더 모이면 취향 노트를 받아 볼 수 있어요.'
    );
    expect(toShelfPreviewMessage(4)).toBe(
      '1권만 더 모이면 취향 노트를 받아 볼 수 있어요.'
    );
  });

  it('5권 이상은 별점만 남았다고 말한다 — 고르기만 한 책엔 별점이 없다', () => {
    expect(toShelfPreviewMessage(5)).toBe(
      '별점만 매기면 바로 취향 노트를 받아 볼 수 있어요.'
    );
    expect(toShelfPreviewMessage(20)).toBe(
      '별점만 매기면 바로 취향 노트를 받아 볼 수 있어요.'
    );
  });
});
