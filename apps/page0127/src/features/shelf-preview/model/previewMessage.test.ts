import { describe, expect, it } from 'vitest';

import { toShelfPreviewMessage } from './previewMessage';

describe('toShelfPreviewMessage', () => {
  it('0권이면 문구가 없다(목표 흐름이 대신한다)', () => {
    expect(toShelfPreviewMessage(0)).toBeNull();
  });

  it('1~2권은 첫인상까지 남은 권수를 말한다 — 홈 부제가 세 권을 약속했다', () => {
    expect(toShelfPreviewMessage(1)).toBe(
      '2권만 더 고르면 첫인상을 알려드릴게요.'
    );
    expect(toShelfPreviewMessage(2)).toBe(
      '1권만 더 고르면 첫인상을 알려드릴게요.'
    );
  });

  it('3~4권은 취향 노트까지 남은 권수를 말한다', () => {
    expect(toShelfPreviewMessage(3)).toBe(
      '2권만 더 모이면 취향 노트를 받아 볼 수 있어요.'
    );
    expect(toShelfPreviewMessage(4)).toBe(
      '1권만 더 모이면 취향 노트를 받아 볼 수 있어요.'
    );
  });

  it('5권 이상은 아무 말도 하지 않는다 — 저장 버튼이 다음 할 일이다', () => {
    expect(toShelfPreviewMessage(5)).toBeNull();
    expect(toShelfPreviewMessage(20)).toBeNull();
  });
});
