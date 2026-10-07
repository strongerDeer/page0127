import { describe, expect, it } from 'vitest';

import { toRenderableSrc } from './imageHost';

const STORAGE = 'https://abc.supabase.co';

describe('toRenderableSrc', () => {
  it('YES24 이미지는 그대로 쓴다', () => {
    const url = 'https://image.yes24.com/goods/123/L';
    expect(toRenderableSrc(url, STORAGE)).toBe(url);
  });

  it('이 환경의 Supabase 저장소 이미지는 그대로 쓴다', () => {
    const url = `${STORAGE}/storage/v1/object/public/book-covers/1/cover.jpg`;
    expect(toRenderableSrc(url, STORAGE)).toBe(url);
  });

  it('알라딘 등 next.config 에 없는 호스트는 버린다 — next/image 가 렌더 중 예외를 던져 페이지가 500 이 된다', () => {
    expect(
      toRenderableSrc(
        'https://image.aladin.co.kr/product/1/94/spineflip/K1_d.jpg',
        STORAGE
      )
    ).toBeNull();
  });

  it('다른 환경의 저장소 주소도 버린다 — 이미지 최적화 설정·CSP 둘 다 이 환경 저장소만 허용한다', () => {
    expect(
      toRenderableSrc(
        'https://other.supabase.co/storage/v1/object/public/a.jpg',
        STORAGE
      )
    ).toBeNull();
  });

  it('비었거나 URL 이 아니면 null', () => {
    expect(toRenderableSrc(null, STORAGE)).toBeNull();
    expect(toRenderableSrc('', STORAGE)).toBeNull();
    expect(toRenderableSrc('not a url', STORAGE)).toBeNull();
  });
});
