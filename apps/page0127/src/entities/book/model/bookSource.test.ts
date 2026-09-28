import { describe, expect, it } from 'vitest';

import { toBookCredit } from './bookSource';

const ISBN = '9788936434120';

describe('toBookCredit', () => {
  it('YES24 상품번호가 있으면 상품 상세페이지로 보낸다', () => {
    // 이 assertion 이 잠그는 것: YES24 이용약관은 "해당 상품의 상품 상세페이지로
    // 연결되는 링크"를 요구한다. 검색 결과로 보내는 것은 그 요구를 덜 만족한다.
    const credit = toBookCredit('yes24', '13137546', ISBN);

    expect(credit?.providerName).toBe('YES24');
    expect(credit?.href).toBe('https://www.yes24.com/product/goods/13137546');
    expect(credit?.isExact).toBe(true);
  });

  it('YES24인데 상품번호가 없으면 ISBN 검색으로 떨어진다', () => {
    // 백필 전이거나 백필이 실패한 행이다. 링크가 없는 것보다는 낫다.
    const credit = toBookCredit('yes24', null, ISBN);

    expect(credit?.href).toContain('search');
    expect(credit?.href).toContain(ISBN);
    expect(credit?.isExact).toBe(false);
  });

  it('알라딘에서 온 책은 알라딘으로 보낸다', () => {
    const credit = toBookCredit('aladin', null, ISBN);

    expect(credit?.providerName).toBe('알라딘');
    expect(credit?.href).toContain('aladin.co.kr');
    expect(credit?.href).toContain(ISBN);
  });

  it('출처를 모르는 옛 행은 아무것도 표기하지 않는다', () => {
    // 이 assertion 이 잠그는 버그: source 가 비었다고 YES24 로 단정하면,
    // 알라딘에서 온 책에 엉뚱한 출처를 적고 엉뚱한 상품으로 링크를 건다.
    // 모르면 비워 두는 게 옳다.
    expect(toBookCredit(null, null, ISBN)).toBeNull();
    expect(toBookCredit(undefined, null, ISBN)).toBeNull();
    expect(toBookCredit('', null, ISBN)).toBeNull();
  });

  it('직접 입력한 책은 출처를 표기하지 않는다', () => {
    // 서점에서 온 정보가 아니다. 없는 출처를 적는 것이 더 나쁘다.
    expect(toBookCredit('manual', null, ISBN)).toBeNull();
  });

  it('알 수 없는 공급자 값도 표기하지 않는다', () => {
    expect(toBookCredit('kyobo', '123', ISBN)).toBeNull();
  });

  it('ISBN을 URL에 안전하게 넣는다', () => {
    const credit = toBookCredit('aladin', null, '979 11/62243664');
    expect(credit?.href).not.toContain(' ');
    expect(credit?.href).toContain('979%2011%2F62243664');
  });
});
