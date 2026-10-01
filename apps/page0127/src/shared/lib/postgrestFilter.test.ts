import { describe, expect, it } from 'vitest';

import { quotePostgrestValue } from './postgrestFilter';

describe('quotePostgrestValue', () => {
  it('평범한 값은 큰따옴표로 감싸기만 한다', () => {
    expect(quotePostgrestValue('9788937460449')).toBe('"9788937460449"');
  });

  it('K코드·ISBN10 처럼 형식이 제각각인 값도 그대로 통과시킨다', () => {
    expect(quotePostgrestValue('K012345678')).toBe('"K012345678"');
    expect(quotePostgrestValue('893746044X')).toBe('"893746044X"');
  });

  it('쉼표·괄호를 넣어 조건을 덧붙이려는 값은 문자열 하나로 갇힌다', () => {
    // 감싸지 않으면 `isbn.eq.x,user_id.neq.0` 이 되어 or 조건이 하나 늘어난다
    expect(quotePostgrestValue('x,user_id.neq.0')).toBe('"x,user_id.neq.0"');
    expect(quotePostgrestValue('x),and(a.eq.1')).toBe('"x),and(a.eq.1"');
  });

  it('큰따옴표와 역슬래시는 이스케이프해 따옴표 밖으로 못 나가게 한다', () => {
    expect(quotePostgrestValue('a"b')).toBe('"a\\"b"');
    expect(quotePostgrestValue('a\\b')).toBe('"a\\\\b"');
    // 역슬래시로 닫는 따옴표를 무력화하려는 시도
    expect(quotePostgrestValue('a\\",x.eq.1')).toBe('"a\\\\\\",x.eq.1"');
  });
});
