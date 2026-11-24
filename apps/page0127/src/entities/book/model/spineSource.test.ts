import { describe, expect, it } from 'vitest';

import { toSpineSource } from './spineSource';

const STORAGE_SPINE =
  'https://abc.supabase.co/storage/v1/object/public/book-covers/9788937460449/spine.jpg';
const ALADIN_SPINE =
  'https://abc.supabase.co/storage/v1/object/public/book-covers/aladin/product/28/47/spineflip/8931005148_d.jpg';
const YES24_SPINE_XL = 'https://image.yes24.com/goods/13137546/SIDE/XL';

describe('toSpineSource', () => {
  it('백필이 옮긴 Storage 책등 + 상품번호면 YES24 작은 사본(L)이 먼저, 사본은 대체용이다', () => {
    expect(
      toSpineSource({
        spine_image: STORAGE_SPINE,
        provider_item_id: '13137546',
      })
    ).toEqual({
      src: 'https://image.yes24.com/goods/13137546/SIDE/L',
      fallbackSrc: STORAGE_SPINE,
    });
  });

  it('YES24 XL 로 저장된 책등은 같은 책등의 L 을 받고, 원래 XL 이 대체용이다', () => {
    expect(
      toSpineSource({ spine_image: YES24_SPINE_XL, provider_item_id: null })
    ).toEqual({
      src: 'https://image.yes24.com/goods/13137546/SIDE/L',
      fallbackSrc: YES24_SPINE_XL,
    });
  });

  it('알라딘에서 건진 책등은 YES24 에 같은 책등이 있다는 보장이 없어 그대로 둔다', () => {
    expect(
      toSpineSource({ spine_image: ALADIN_SPINE, provider_item_id: '13137546' })
    ).toEqual({ src: ALADIN_SPINE, fallbackSrc: null });
  });

  it('상품번호가 없으면 Storage 사본을 그대로 쓴다', () => {
    expect(
      toSpineSource({ spine_image: STORAGE_SPINE, provider_item_id: null })
    ).toEqual({ src: STORAGE_SPINE, fallbackSrc: null });
  });

  it('책등이 없으면 상품번호가 있어도 YES24 를 쓰지 않는다(회색 대체 그림 방지)', () => {
    expect(
      toSpineSource({ spine_image: null, provider_item_id: '13137546' })
    ).toEqual({ src: null, fallbackSrc: null });
  });
});
