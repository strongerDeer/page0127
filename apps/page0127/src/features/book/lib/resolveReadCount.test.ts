import { describe, expect, it } from 'vitest';

import { resolveReadCount } from './resolveReadCount';

describe('resolveReadCount', () => {
  it('처음 읽는 책은 1회독이다', () => {
    expect(resolveReadCount(null, '9788901234567')).toBe(1);
  });

  it('같은 책이면 기존 회독수에 1을 더한다', () => {
    expect(
      resolveReadCount(
        { isbn: '9788901234567', read_count: 2 },
        '9788901234567'
      )
    ).toBe(3);
  });

  it('ISBN이 다르면 기존 책의 회독수를 물려받지 않는다', () => {
    // 이 assertion 이 잠그는 버그: 중복 다이얼로그를 '취소' 해도 existingBook 이
    // 지워지지 않아서, 그 다음 검색 결과에서 '다른 책' 을 고르면 남의 read_count 가
    // 새 책에 붙는다. 읽은 적 없는 책이 read_count: 2 로 저장되고, 결과 카드는
    // "2회독을 기록했어요" 를 헤드라인으로 써서 이 트랙이 만들려던
    // "첫 번째 책이 책장에 꽂혔어요" 보상을 삼킨다.
    expect(
      resolveReadCount(
        { isbn: '9788901234567', read_count: 1 },
        '9791198765432'
      )
    ).toBe(1);
  });
});
