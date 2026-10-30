import { describe, expect, it } from 'vitest';

import { missingSpineCandidate } from './spineImage';

describe('missingSpineCandidate', () => {
  it('책등이 비어 있는 YES24 책이면 상품번호로 책등 주소를 만든다', () => {
    expect(
      missingSpineCandidate({
        spine_image: null,
        source: 'yes24',
        provider_item_id: '102831219',
      })
    ).toBe('https://image.yes24.com/goods/102831219/SIDE/XL');
  });

  it('이미 책등이 있으면 다시 확인하지 않는다', () => {
    expect(
      missingSpineCandidate({
        spine_image: 'https://image.yes24.com/goods/102831219/SIDE/XL',
        source: 'yes24',
        provider_item_id: '102831219',
      })
    ).toBeNull();
  });

  it('YES24 가 아닌 책(직접 입력·알라딘·출처 모름)은 확인하지 않는다', () => {
    for (const source of ['manual', 'aladin', null]) {
      expect(
        missingSpineCandidate({
          spine_image: null,
          source,
          provider_item_id: '123',
        })
      ).toBeNull();
    }
  });

  it('상품번호가 없으면 주소를 만들 수 없다', () => {
    expect(
      missingSpineCandidate({
        spine_image: null,
        source: 'yes24',
        provider_item_id: null,
      })
    ).toBeNull();
  });
});
