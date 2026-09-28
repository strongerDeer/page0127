import { describe, expect, it } from 'vitest';

import {
  deriveAladinSpineUrl,
  mapAladinBook,
  mapAladinLookUpResponse,
  mapAladinSearchResponse,
} from './aladin';

import type { AladinBook, AladinBookDetail } from '@/shared/types/aladin';

/** 알라딘 ItemSearch 가 실제로 내려주는 형태 (2026-09-28 실호출 기준) */
const 소년이온다: AladinBook = {
  title: '소년이 온다',
  author: '한강 (지은이)',
  pubDate: '2014-05-19',
  description: '2024 노벨문학상 수상작가',
  isbn13: '9788936434120',
  cover: 'https://image.aladin.co.kr/product/4086/97/cover200/8936434128_2.jpg',
  publisher: '창비',
  categoryName: '국내도서>소설/시/희곡>한국소설',
  priceStandard: 15000,
  link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=4086976',
  subInfo: { itemPage: 216 },
};

describe('mapAladinBook', () => {
  it('알라딘 응답을 내부 형태로 옮긴다', () => {
    const book = mapAladinBook(소년이온다);

    expect(book).not.toBeNull();
    expect(book?.isbn).toBe('9788936434120');
    expect(book?.title).toBe('소년이 온다');
    expect(book?.publisher).toBe('창비');
    expect(book?.page).toBe(216);
    expect(book?.source).toBe('aladin');
  });

  it('알라딘 출간일은 이미 저장 형식이라 그대로 통과한다', () => {
    // 저장 형식이 ISO(YYYY-MM-DD)라 기존 행을 다시 쓸 일이 없다.
    expect(mapAladinBook(소년이온다)?.pubDate).toBe('2014-05-19');
  });

  it('표지를 cover500으로 올려서 넘긴다', () => {
    // 알라딘은 Cover=Big 을 줘도 cover200 을 내려준다. 화면에서 흐릿하게 보이던 원인.
    expect(mapAladinBook(소년이온다)?.coverImage).toContain('cover500');
    expect(mapAladinBook(소년이온다)?.coverImage).not.toContain('cover200');
  });

  it('ISBN13이 없으면 버린다', () => {
    // 이 assertion 이 잠그는 버그: global_books.isbn 은 UNIQUE 키다. 빈 ISBN 을
    // 그대로 넣으면 ISBN 없는 책들이 전부 같은 행으로 뭉개져 서로를 덮어쓴다.
    expect(mapAladinBook({ ...소년이온다, isbn13: '' })).toBeNull();
    expect(mapAladinBook({ ...소년이온다, isbn13: '   ' })).toBeNull();
  });

  it('알라딘은 부제를 제목에서 떼어내지 않는다', () => {
    // 알라딘 title 은 `소년이 온다 - 2024 노벨문학상 수상작가` 처럼 합쳐져 온다.
    // 하이픈으로 자르면 제목 자체에 하이픈이 든 책이 잘리므로 건드리지 않는다.
    expect(mapAladinBook(소년이온다)?.subTitle).toBeNull();
  });

  it('표지 URL에서 책등 주소를 유도한다', () => {
    // 2026-09-28 실측으로 이 주소가 실제로 200을 준다. 파일명 앞부분이 ISBN10이다.
    expect(mapAladinBook(소년이온다)?.spineImage).toBe(
      'https://image.aladin.co.kr/product/4086/97/spineflip/8936434128_d.jpg'
    );
  });

  it('알라딘은 뒷표지를 제공하지 않는다', () => {
    expect(mapAladinBook(소년이온다)?.backImage).toBeNull();
  });

  it('표지 URL이 예상 형태가 아니면 책등을 만들지 않는다', () => {
    // 임의로 문자열을 이어 붙여 깨진 주소를 넘기면, 화면이 그 404를 기다리느라
    // 등록 후 3초를 헛되이 쓴다. 만들 수 없으면 아예 만들지 않는다.
    expect(deriveAladinSpineUrl('https://image.aladin.co.kr/no-pattern.jpg')).toBeNull();
    expect(
      mapAladinBook({ ...소년이온다, cover: 'https://x/y.jpg' })?.spineImage
    ).toBeNull();
  });

  it('상세 응답이면 fullDescription과 목차를 쓴다', () => {
    const detail: AladinBookDetail = {
      ...소년이온다,
      fullDescription: '말라파르테 문학상, 만해문학상 수상작',
      toc: '1장 어린 새',
    };

    const book = mapAladinBook(detail);
    expect(book?.description).toBe('말라파르테 문학상, 만해문학상 수상작');
    expect(book?.toc).toBe('1장 어린 새');
  });

  it('상세 응답이어도 fullDescription이 비면 목록용 소개로 떨어진다', () => {
    const detail: AladinBookDetail = {
      ...소년이온다,
      fullDescription: '',
      toc: '1장 어린 새',
    };

    expect(mapAladinBook(detail)?.description).toBe('2024 노벨문학상 수상작가');
  });
});

describe('mapAladinSearchResponse', () => {
  it('ISBN 없는 항목을 걸러내고 나머지를 옮긴다', () => {
    const result = mapAladinSearchResponse(
      {
        version: '20131101',
        title: '',
        link: '',
        pubDate: '',
        totalResults: 17,
        startIndex: 1,
        itemsPerPage: 2,
        item: [소년이온다, { ...소년이온다, isbn13: '' }],
      },
      1
    );

    expect(result.items).toHaveLength(1);
    // 걸러낸 뒤에도 totalResults 는 공급자가 말한 값 그대로다 — 페이지네이션이 이 값을 쓴다
    expect(result.totalResults).toBe(17);
    expect(result.page).toBe(1);
  });

  it('결과가 없어도 터지지 않는다', () => {
    const result = mapAladinSearchResponse(
      {
        version: '20131101',
        title: '',
        link: '',
        pubDate: '',
        totalResults: 0,
        startIndex: 1,
        itemsPerPage: 0,
        item: [],
      },
      1
    );

    expect(result.items).toEqual([]);
    expect(result.totalResults).toBe(0);
  });
});

describe('mapAladinLookUpResponse', () => {
  it('첫 번째 항목을 돌려준다', () => {
    const book = mapAladinLookUpResponse({
      version: '20131101',
      title: '',
      link: '',
      pubDate: '',
      item: [{ ...소년이온다, toc: '1장 어린 새' }],
    });

    expect(book?.isbn).toBe('9788936434120');
    expect(book?.toc).toBe('1장 어린 새');
  });

  it('항목이 없으면 null이다', () => {
    expect(
      mapAladinLookUpResponse({
        version: '20131101',
        title: '',
        link: '',
        pubDate: '',
        item: [],
      })
    ).toBeNull();
  });
});
