import { describe, expect, it } from 'vitest';

import { savedBookMessage } from './savedBookMessage';

describe('savedBookMessage', () => {
  it('첫 권은 순서 대신 "첫 번째"로 부른다', () => {
    expect(savedBookMessage(1, 1)).toBe('첫 번째 책이 책장에 꽂혔어요');
  });

  it('두 번째부터는 몇 번째인지 알려준다', () => {
    expect(savedBookMessage(3, 1)).toBe('3번째 책이 책장에 꽂혔어요');
  });

  it('재독은 권수보다 회독을 먼저 말한다', () => {
    // 5권째이면서 2회독이면 "2회독"이 더 정확한 사건이다
    expect(savedBookMessage(5, 2)).toBe('2회독을 기록했어요');
  });

  it('권수를 못 가져와도 카드는 뜬다', () => {
    // 통계 조회가 실패해도 저장은 성공했다 — 숫자만 빼고 확인은 해준다
    expect(savedBookMessage(null, 1)).toBe('책장에 꽂혔어요');
  });

  it('권수가 0으로 와도 첫 권으로 취급한다', () => {
    // 방어: 통계가 방금 저장분을 아직 세지 않은 경우
    expect(savedBookMessage(0, 1)).toBe('첫 번째 책이 책장에 꽂혔어요');
  });
});
