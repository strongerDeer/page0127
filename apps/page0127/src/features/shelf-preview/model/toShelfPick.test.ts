import { describe, expect, it } from 'vitest';

import {
  fromGlobalBookRow,
  fromProviderBook,
  orderByIsbnList,
} from './toShelfPick';

import type { ProviderBook } from '@/shared/api/book-provider';

const STORAGE = 'https://abc.supabase.co';
const STORAGE_COVER = `${STORAGE}/storage/v1/object/public/covers/a.jpg`;
const STORAGE_SPINE = `${STORAGE}/storage/v1/object/public/spines/a.jpg`;

describe('orderByIsbnList', () => {
  it('목록 순서대로 세우고, 없는 isbn 은 건너뛴다', () => {
    const rows = [{ isbn: 'c' }, { isbn: 'a' }];
    expect(orderByIsbnList(rows, ['a', 'b', 'c']).map((r) => r.isbn)).toEqual([
      'a',
      'c',
    ]);
  });

  it('DB 에 한 권도 없으면 빈 배열 — 개발 DB 에는 운영 책이 없을 수 있다', () => {
    expect(orderByIsbnList([], ['a'])).toEqual([]);
  });
});

describe('fromGlobalBookRow', () => {
  it('Storage 표지 + 상품번호면 YES24 를 먼저, Storage 를 대체로', () => {
    const pick = fromGlobalBookRow(
      {
        isbn: '8936434594',
        provider_item_id: '108422348',
        title: '채식주의자',
        author: '한강',
        publisher: '창비',
        cover_image: STORAGE_COVER,
        spine_image: STORAGE_SPINE,
        pub_date: '2022-03-28',
        category: '소설',
        source: 'yes24',
      },
      STORAGE
    );
    expect(pick.coverSrc).toContain('image.yes24.com');
    expect(pick.coverFallback).toBe(STORAGE_COVER);
    expect(pick.spineSrc).toBe(STORAGE_SPINE);
    // 저장할 때는 DB 원본 주소를 그대로 들고 간다
    expect(pick.book.cover_image).toBe(STORAGE_COVER);
  });

  it('그릴 수 없는 호스트(알라딘 잔존)는 화면 주소를 비운다', () => {
    const pick = fromGlobalBookRow(
      {
        isbn: 'x',
        provider_item_id: null,
        title: 't',
        author: null,
        publisher: null,
        cover_image: 'https://image.aladin.co.kr/a.jpg',
        spine_image: 'https://image.aladin.co.kr/s.jpg',
        pub_date: null,
        category: null,
        source: null,
      },
      STORAGE
    );
    expect(pick.coverSrc).toBeNull();
    expect(pick.spineSrc).toBeNull();
  });
});

describe('fromProviderBook', () => {
  it('검색 결과를 저장용 필드로 옮긴다', () => {
    const b: ProviderBook = {
      isbn: '9788937462672',
      title: '페스트',
      subTitle: null,
      author: '알베르 카뮈',
      publisher: '민음사',
      pubDate: '2011-03-25',
      description: '',
      category: '소설',
      coverImage: 'https://image.yes24.com/goods/4827619/L',
      spineImage: null,
      backImage: null,
      page: null,
      toc: null,
      dimensions: null,
      source: 'yes24',
      providerItemId: '4827619',
      providerLink: 'https://www.yes24.com/product/goods/4827619',
    };
    const pick = fromProviderBook(b);
    expect(pick.book).toEqual({
      isbn: '9788937462672',
      provider_item_id: '4827619',
      title: '페스트',
      author: '알베르 카뮈',
      publisher: '민음사',
      cover_image: 'https://image.yes24.com/goods/4827619/L',
      spine_image: null,
      pub_date: '2011-03-25',
      category: '소설',
      source: 'yes24',
    });
    expect(pick.coverSrc).toBe('https://image.yes24.com/goods/4827619/L');
  });
});
