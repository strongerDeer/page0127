import { describe, expect, it } from 'vitest';

import { toCoverSource } from './coverSource';

const STORAGE =
  'https://abc.supabase.co/storage/v1/object/public/book-covers/9788937460449/cover.jpg';
const YES24_XL = 'https://image.yes24.com/goods/13137546/XL';

describe('toCoverSource', () => {
  it('Storage 사본과 상품번호가 있으면 YES24 가 먼저, 사본은 대체용이다', () => {
    expect(
      toCoverSource({ cover_image: STORAGE, provider_item_id: '13137546' })
    ).toEqual({
      src: 'https://image.yes24.com/goods/13137546',
      fallbackSrc: STORAGE,
    });
  });

  it('표지가 없으면 상품번호가 있어도 YES24 를 쓰지 않는다', () => {
    // 이 assertion 이 잠그는 것: YES24 는 없는 표지에 200 회색 플레이스홀더를 줘서
    // onError 로 걸러지지 않는다. 진짜 표지를 확인한 적 없는 책은 제목을 조판한다.
    expect(
      toCoverSource({ cover_image: null, provider_item_id: '13137546' })
    ).toEqual({ src: null, fallbackSrc: null });
    expect(
      toCoverSource({ cover_image: '', provider_item_id: '13137546' })
    ).toEqual({ src: null, fallbackSrc: null });
  });

  it('이미 YES24 주소로 저장된 책은 그대로 쓰고 대체 주소가 없다', () => {
    expect(
      toCoverSource({ cover_image: YES24_XL, provider_item_id: '13137546' })
    ).toEqual({ src: YES24_XL, fallbackSrc: null });
  });

  it('상품번호가 없으면 저장된 주소를 그대로 쓴다 (직접 입력한 책 등)', () => {
    expect(
      toCoverSource({ cover_image: STORAGE, provider_item_id: null })
    ).toEqual({ src: STORAGE, fallbackSrc: null });
    // 상품번호 필드를 아예 조회하지 않은 화면도 지금처럼 동작한다
    expect(toCoverSource({ cover_image: STORAGE })).toEqual({
      src: STORAGE,
      fallbackSrc: null,
    });
  });
});
