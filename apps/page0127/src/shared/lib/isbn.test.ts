import { describe, expect, it } from 'vitest';

import { isValidIsbn13 } from './isbn';

describe('isValidIsbn13', () => {
  it('실제 도서 ISBN을 통과시킨다', () => {
    expect(isValidIsbn13('9788936434120')).toBe(true); // 소년이 온다
    expect(isValidIsbn13('9788934942467')).toBe(true);
  });

  it('979 로 시작하는 ISBN도 통과시킨다', () => {
    // 979 는 2013년 이후 발급되는 정식 도서 접두사다. 978만 받으면 최신 책이 막힌다.
    expect(isValidIsbn13('9791162243664')).toBe(true);
  });

  it('자리표시자 ISBN을 막는다', () => {
    // 이 assertion 이 잠그는 버그: YES24 에 isbn13 이 '9999999999999' 인 상품이
    // 실제로 있다. 없는 ISBN 을 조회하면 그게 걸려 나와 엉뚱한 책이 등록된다.
    expect(isValidIsbn13('9999999999999')).toBe(false);
    expect(isValidIsbn13('0000000000000')).toBe(false);
  });

  it('잡지(ISSN, 977 접두사)를 막는다', () => {
    // 이 assertion 이 잠그는 버그: 잡지는 **같은 번호가 여러 호에 붙는다.**
    // 어린이과학동아 18호와 19호가 둘 다 9771739361205 였고, 어떤 잡지는
    // A/B/C/D형 네 상품이 전부 같은 번호였다. isbn 이 UNIQUE 키라
    // 나중에 담은 호가 먼저 담은 호를 덮어쓴다.
    expect(isValidIsbn13('9771739361205')).toBe(false);
    expect(isValidIsbn13('9771976938000')).toBe(false);
    expect(isValidIsbn13('9772586337009')).toBe(false);
  });

  it('체크섬이 틀리면 막는다', () => {
    // 마지막 자리만 바꾼 값 — 오타나 잘린 데이터를 잡는다
    expect(isValidIsbn13('9788936434121')).toBe(false);
  });

  it('자릿수나 형식이 어긋나면 막는다', () => {
    expect(isValidIsbn13('978893643412')).toBe(false); // 12자리
    expect(isValidIsbn13('97889364341201')).toBe(false); // 14자리
    expect(isValidIsbn13('978-89-364-3412-0')).toBe(false); // 하이픈
    expect(isValidIsbn13('8936434128')).toBe(false); // ISBN10
  });

  it('값이 없으면 막는다', () => {
    expect(isValidIsbn13(null)).toBe(false);
    expect(isValidIsbn13(undefined)).toBe(false);
    expect(isValidIsbn13('')).toBe(false);
    expect(isValidIsbn13('   ')).toBe(false);
  });

  it('앞뒤 공백은 걷어내고 본다', () => {
    expect(isValidIsbn13('  9788936434120  ')).toBe(true);
  });
});
