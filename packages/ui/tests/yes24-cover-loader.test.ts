import { describe, expect, it } from 'vitest';

import {
  parseYes24CoverItemId,
  pickYes24CoverSize,
  toYes24CoverBase,
  yes24CoverLoader,
  yes24LargeCoverLoader,
} from '../src/lib/yes24CoverLoader';

/**
 * YES24 표지 loader 의 규칙을 고정한다.
 *
 * 이 경계가 틀어지면 에러 없이 **용량만** 바뀐다 — 목록 표지가 XL(249KB)로
 * 돌아가거나, 상세 표지가 M(151px)으로 흐려진다. 둘 다 화면은 멀쩡해 보인다.
 */
describe('parseYes24CoverItemId', () => {
  it('크기가 붙은 앞표지 주소에서 상품번호를 꺼낸다', () => {
    expect(
      parseYes24CoverItemId('https://image.yes24.com/goods/13137546/XL')
    ).toBe('13137546');
    expect(
      parseYes24CoverItemId('https://image.yes24.com/goods/13137546/M')
    ).toBe('13137546');
  });

  it('크기를 뗀 주소도 받는다 (BookCover 가 넘기는 형태)', () => {
    expect(
      parseYes24CoverItemId('https://image.yes24.com/goods/13137546')
    ).toBe('13137546');
  });

  it('책등·뒷표지는 앞표지가 아니다', () => {
    // 비율이 달라(책등 108x1200) 앞표지 크기 계단을 적용하면 안 된다.
    expect(
      parseYes24CoverItemId('https://image.yes24.com/goods/13137546/SIDE/XL')
    ).toBeNull();
    expect(
      parseYes24CoverItemId('https://image.yes24.com/goods/13137546/BACK/XL')
    ).toBeNull();
  });

  it('다른 호스트·흉내 낸 도메인·http·상대 경로는 거른다', () => {
    expect(
      parseYes24CoverItemId('https://image.yes24.com.evil.com/goods/1/XL')
    ).toBeNull();
    expect(
      parseYes24CoverItemId('http://image.yes24.com/goods/1/XL')
    ).toBeNull();
    expect(
      parseYes24CoverItemId(
        'https://abc.supabase.co/storage/v1/object/public/book-covers/9788937460449/cover.jpg'
      )
    ).toBeNull();
    expect(parseYes24CoverItemId('/images/no-book.jpg')).toBeNull();
    expect(parseYes24CoverItemId(null)).toBeNull();
  });
});

describe('pickYes24CoverSize', () => {
  it('M 의 실제 폭(151) 이하는 M 이다', () => {
    expect(pickYes24CoverSize(64)).toBe('M');
    expect(pickYes24CoverSize(128)).toBe('M');
    expect(pickYes24CoverSize(151)).toBe('M');
    expect(pickYes24CoverSize(152)).toBe('L');
  });

  it('XL 을 허용하지 않으면 아무리 커도 L 에서 멈춘다', () => {
    // 이 assertion 이 잠그는 것: 3x 화면의 격자 표지가 640 단계로 올라가도
    // XL(249KB)을 받지 않는다. 열여덟 장이면 4MB 가 넘는다.
    expect(pickYes24CoverSize(640)).toBe('L');
    expect(pickYes24CoverSize(3840)).toBe('L');
  });

  it('XL 을 허용하면 384 단계까지는 L, 그 위부터 XL 이다', () => {
    // srcset 은 정해진 단계(256·384·640…)로만 요청한다. 384 는 L(275px)의
    // 1.4배라 표지에선 눈에 띄지 않는다.
    expect(pickYes24CoverSize(256, true)).toBe('L');
    expect(pickYes24CoverSize(384, true)).toBe('L');
    expect(pickYes24CoverSize(640, true)).toBe('XL');
  });
});

describe('yes24CoverLoader', () => {
  it('목록 표지는 2x 에서 M, 3x 격자에서도 L 을 넘지 않는다', () => {
    // sm 계단(높이 80 → 폭 55)의 2x 는 128w 단계다
    const base = toYes24CoverBase('13137546');
    expect(yes24CoverLoader({ src: base, width: 128 })).toBe(`${base}/M`);
    expect(yes24CoverLoader({ src: base, width: 256 })).toBe(`${base}/L`);
    expect(yes24CoverLoader({ src: base, width: 640 })).toBe(`${base}/L`);
  });

  it('큰 표지용 loader 는 640 단계부터 XL 을 받는다', () => {
    // 상세 표지(CSS 224px)는 2x 에서 448px → 640 단계
    const base = toYes24CoverBase('13137546');
    expect(yes24LargeCoverLoader({ src: base, width: 256 })).toBe(`${base}/L`);
    expect(yes24LargeCoverLoader({ src: base, width: 640 })).toBe(`${base}/XL`);
  });

  it('loader 결과는 넘긴 src 와 달라야 한다 (next/image 개발 경고 조건)', () => {
    const base = toYes24CoverBase('13137546');
    expect(yes24CoverLoader({ src: base, width: 400 })).not.toBe(base);
  });

  it('YES24 표지가 아니면 손대지 않는다', () => {
    const storage =
      'https://abc.supabase.co/storage/v1/object/public/book-covers/1/cover.jpg';
    expect(yes24CoverLoader({ src: storage, width: 128 })).toBe(storage);
  });
});
