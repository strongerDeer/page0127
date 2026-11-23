import { describe, expect, it } from 'vitest';

import { toCoverSource } from '@/entities/book';

import { LIBRARY_BOOK_COLUMNS } from './libraryBookColumns';

const columns = LIBRARY_BOOK_COLUMNS.split(',');

describe('서재 조회 칸', () => {
  it('표지 경로를 정하는 provider_item_id 를 받는다 — 빠지면 큰 Storage 사본으로 떨어진다(#455 회귀)', () => {
    expect(columns).toContain('provider_item_id');
    expect(columns).toContain('cover_image');
  });

  it('상품번호가 있으면 YES24 사본이 먼저, Storage 사본은 대체로만 쓴다', () => {
    const stored =
      'https://example.supabase.co/storage/v1/object/public/book-covers/9788936439651/cover.jpg';
    expect(
      toCoverSource({ cover_image: stored, provider_item_id: '12345' })
    ).toEqual({
      src: 'https://image.yes24.com/goods/12345',
      fallbackSrc: stored,
    });
    expect(toCoverSource({ cover_image: stored })).toEqual({
      src: stored,
      fallbackSrc: null,
    });
  });
});
