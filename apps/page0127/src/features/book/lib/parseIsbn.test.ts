import { describe, expect, it } from 'vitest';

import { parseIsbn } from './parseIsbn';

describe('parseIsbn', () => {
  it('바코드 리더기가 넣는 13자리 그대로를 ISBN 으로 본다', () => {
    expect(parseIsbn('9788936434120')).toBe('9788936434120');
  });

  it('책 뒤에 적힌 하이픈·공백 섞인 표기도 받는다', () => {
    expect(parseIsbn('978-89-364-3412-0')).toBe('9788936434120');
    expect(parseIsbn(' 978 89 364 3412 0 ')).toBe('9788936434120');
  });

  it('979 로 시작하는 ISBN 도 받는다', () => {
    expect(parseIsbn('9791190090018')).toBe('9791190090018');
  });

  it('체크 숫자가 틀리면 ISBN 이 아니다', () => {
    expect(parseIsbn('9788936434121')).toBeNull();
  });

  it('옛 ISBN10 은 ISBN13 으로 바꿔 준다', () => {
    expect(parseIsbn('8936434128')).toBe('9788936434120');
    expect(parseIsbn('0-8044-2957-X')).toBe('9780804429573');
  });

  it('숫자로 된 제목이나 일반 검색어는 ISBN 이 아니다', () => {
    expect(parseIsbn('1984')).toBeNull();
    expect(parseIsbn('소년이 온다')).toBeNull();
    // 978 로 시작하지 않는 13자리(일반 상품 바코드)
    expect(parseIsbn('8801234567893')).toBeNull();
  });
});
