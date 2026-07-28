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

    // 첫 권이면서 2회독이면 "첫 번째 책"이 아니라 "2회독"이어야 한다.
    // 재독 판정이 첫 권 판정(<=1)보다 아래로 내려가면 이 케이스가 조용히
    // "첫 번째 책이 책장에 꽂혔어요"로 바뀌는데, 그게 바로 이 함수를
    // 분리한 이유가 된 버그다 — 이 assertion이 그걸 잠근다.
    expect(savedBookMessage(1, 2)).toBe('2회독을 기록했어요');
  });

  it('권수를 못 가져와도 카드는 뜬다', () => {
    // 통계 조회가 실패해도 저장은 성공했다 — 숫자만 빼고 확인은 해준다
    expect(savedBookMessage(null, 1)).toBe('책장에 꽂혔어요');
  });

  it('권수 0은 첫 권이 아니라 조회 실패로 읽는다', () => {
    // getBookStats 는 DB·RLS 에러를 스스로 잡아 totalCompletedBooks: 0 을 반환하고
    // 라우트가 200 으로 감싸므로, 0 은 "완독 0권"이 아니라 "못 가져왔다"는 뜻이다.
    // 성공한 호출은 방금 저장한 완독 행 때문에 최소 1 이라 0 이 나올 수 없다
    // → 0 을 첫 권으로 읽으면 30권 읽은 사용자에게 "첫 번째 책"이라고 말한다.
    expect(savedBookMessage(0, 1)).toBe('책장에 꽂혔어요');
  });
});
