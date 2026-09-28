import { describe, expect, it } from 'vitest';

import { mapToMainCategory } from '@/shared/lib/categoryMapper';

import { mapYes24Book, mapYes24ItemList, unwrapYes24Response } from './yes24';

import type { Yes24Item } from '@/shared/types/yes24';

/** 2026-09-28 실호출 응답을 그대로 옮긴 것 (ISBN 9788936434120) */
const 소년이온다: Yes24Item = {
  itemId: 13137546,
  title: '소년이 온다',
  subTitle: '',
  author: '한강 저',
  publisher: '창비',
  goodsSortNm: '국내도서-소설/시/희곡',
  isbn10: '8936434128',
  isbn13: '9788936434120',
  publishDate: '20140519',
  link: 'https://www.yes24.com/product/goods/13137546',
  cover: 'https://image.yes24.com/goods/13137546/L',
  itemStatus: '판매중',
  pages: 216,
  height: 20,
  width: 153,
  length: 224,
  weight: 301,
  contentDetail: {
    bookIntroduction: '말라파르테 문학상, 만해문학상 수상작',
    bookSummary: null,
    tableOfContents: '1장 어린 새\r\n2장 검은 숨',
  },
};

/** 실호출에서 나온 세트 상품 — isbn13이 빈 문자열로 온다 */
const 세트상품: Yes24Item = {
  ...소년이온다,
  itemId: 134872831,
  title: '채식주의자 + 소년이 온다 세트',
  isbn10: '',
  isbn13: '',
};

describe('mapYes24Book', () => {
  it('YES24 응답을 내부 형태로 옮긴다', () => {
    const book = mapYes24Book(소년이온다);

    expect(book).not.toBeNull();
    expect(book?.isbn).toBe('9788936434120');
    expect(book?.title).toBe('소년이 온다');
    expect(book?.author).toBe('한강 저');
    expect(book?.publisher).toBe('창비');
    expect(book?.page).toBe(216);
    expect(book?.source).toBe('yes24');
  });

  it('출간일을 저장 형식으로 정규화한다', () => {
    expect(mapYes24Book(소년이온다)?.pubDate).toBe('2014-05-19');
  });

  it('부제를 제목과 합치지 않고 따로 둔다', () => {
    const book = mapYes24Book({
      ...소년이온다,
      title: '소년이 온다',
      subTitle: '출간 10주년 기념 특별한정판',
    });

    expect(book?.title).toBe('소년이 온다');
    expect(book?.subTitle).toBe('출간 10주년 기념 특별한정판');
  });

  it('부제가 빈 문자열이면 null로 눕힌다', () => {
    // 이 assertion 이 잠그는 버그: 부제는 대부분 빈 문자열로 온다. 그대로 두면
    // 화면이 둘째 줄에 빈 줄을 그려서 카드마다 높이가 들쭉날쭉해진다.
    expect(mapYes24Book({ ...소년이온다, subTitle: '' })?.subTitle).toBeNull();
    expect(mapYes24Book({ ...소년이온다, subTitle: '  ' })?.subTitle).toBeNull();
    expect(
      mapYes24Book({ ...소년이온다, subTitle: undefined })?.subTitle
    ).toBeNull();
  });

  it('상품번호를 문자열로 보관한다', () => {
    // 이 assertion 이 잠그는 것: 응답은 숫자(13137546)로 오는데 이미지 URL 조립과
    // DB 컬럼(text)은 문자열을 쓴다. 숫자인 채로 흘리면 URL이 조용히 깨진다.
    expect(mapYes24Book(소년이온다)?.providerItemId).toBe('13137546');
  });

  it('상품번호로 표지·책등·뒷표지 주소를 만든다', () => {
    const book = mapYes24Book(소년이온다);

    expect(book?.coverImage).toBe('https://image.yes24.com/goods/13137546/XL');
    expect(book?.spineImage).toBe(
      'https://image.yes24.com/goods/13137546/SIDE/XL'
    );
    expect(book?.backImage).toBe(
      'https://image.yes24.com/goods/13137546/BACK/XL'
    );
  });

  it('표지는 응답의 cover(L)를 그대로 쓰지 않고 XL로 올린다', () => {
    // 응답은 .../L 로 온다. 우리 Storage에 옮길 원본이라 가장 큰 걸 받는다.
    expect(소년이온다.cover).toContain('/L');
    expect(mapYes24Book(소년이온다)?.coverImage).toContain('/XL');
  });

  it('목차와 책소개를 가져온다', () => {
    // 문서상 목차는 별도 API인데 실제로는 검색·상세 응답에 같이 온다 → 호출 절반.
    const book = mapYes24Book(소년이온다);
    expect(book?.toc).toBe('1장 어린 새\r\n2장 검은 숨');
    expect(book?.description).toBe('말라파르테 문학상, 만해문학상 수상작');
  });

  it('세트 상품처럼 ISBN13이 없으면 버린다', () => {
    // 이 assertion 이 잠그는 버그: global_books.isbn 은 UNIQUE 키다. 빈 ISBN 을
    // 그대로 넣으면 ISBN 없는 상품들이 전부 같은 행으로 뭉개져 서로를 덮어쓴다.
    expect(mapYes24Book(세트상품)).toBeNull();
    expect(mapYes24Book({ ...소년이온다, isbn13: '   ' })).toBeNull();
  });

  it('잡지와 자리표시자 ISBN도 버린다', () => {
    // 잡지는 같은 ISSN 이 여러 호에 붙어 서로를 덮어쓴다. 자리표시자
    // '9999999999999' 는 YES24 상품에 실제로 박혀 있어서, 없는 ISBN 을
    // 조회하면 엉뚱한 성인 만화가 걸려 나온다(2026-09-28 실측).
    expect(mapYes24Book({ ...소년이온다, isbn13: '9771739361205' })).toBeNull();
    expect(mapYes24Book({ ...소년이온다, isbn13: '9999999999999' })).toBeNull();
  });

  it('책 실물 치수를 옮긴다 — height가 두께다', () => {
    // 이 assertion 이 잠그는 버그: YES24 는 `height` 가 **두께**(20mm)이고
    // 판형 세로는 `length`(224mm)다. 이름만 보고 height→height 로 옮기면
    // 책장 UI가 모든 책을 20cm 두께로 그린다.
    const dimensions = mapYes24Book(소년이온다)?.dimensions;

    expect(dimensions?.width).toBe(153); // 판형 가로
    expect(dimensions?.height).toBe(224); // 판형 세로 (YES24 length)
    expect(dimensions?.thickness).toBe(20); // 책등 두께 (YES24 height)
  });

  it('치수가 하나도 없으면 null이다', () => {
    const { width: _w, length: _l, height: _h, ...검색응답 } = 소년이온다;
    expect(mapYes24Book(검색응답 as Yes24Item)?.dimensions).toBeNull();
  });

  it('치수 0은 "없음"으로 눕힌다', () => {
    // 이 assertion 이 잠그는 버그: YES24 는 치수를 등록하지 않은 상품에 0 을 준다
    // (2026-09-28 실측, ISBN 9791162243664). 0 을 그대로 저장하면 책장이 그 책을
    // 두께 0mm 로 그려 선 하나로 사라진다 — 값이 없을 때의 기본 두께와 구분되지 않는다.
    const book = mapYes24Book({ ...소년이온다, width: 0, length: 0, height: 0 });
    expect(book?.dimensions).toBeNull();

    const partial = mapYes24Book({ ...소년이온다, height: 0 });
    expect(partial?.dimensions?.thickness).toBeNull();
    expect(partial?.dimensions?.width).toBe(153);
  });

  it('상세 조회가 아니면 쪽수가 없어도 터지지 않는다', () => {
    const { pages: _pages, ...검색응답 } = 소년이온다;
    expect(mapYes24Book(검색응답 as Yes24Item)?.page).toBeNull();
  });

  it('contentDetail이 통째로 없어도 터지지 않는다', () => {
    const book = mapYes24Book({ ...소년이온다, contentDetail: null });
    expect(book?.toc).toBeNull();
    expect(book?.description).toBe('');
  });

  it('link가 비면 상품번호로 출처 링크를 만든다', () => {
    // 출처 링크 제공은 YES24 이용약관상 의무라 비워 두면 안 된다.
    expect(mapYes24Book({ ...소년이온다, link: '' })?.providerLink).toBe(
      'https://www.yes24.com/product/goods/13137546'
    );
  });
});

describe('YES24 분류를 기존 대분류로 옮길 수 있다', () => {
  it('구분자가 달라도 categoryMapper가 그대로 알아본다', () => {
    // 알라딘은 `국내도서>소설/시/희곡>한국소설`, YES24는 `국내도서-소설/시/희곡`.
    // mapToMainCategory 가 includes() 기반이라 구분자에 의존하지 않는다 —
    // 이 테스트가 통과하는 한 categoryMapper 는 손댈 필요가 없다.
    const book = mapYes24Book(소년이온다);
    expect(mapToMainCategory(book?.category ?? null)).toBe('소설/시/희곡');
  });

  it('다른 분류도 알라딘과 같은 대분류로 떨어진다', () => {
    expect(mapToMainCategory('국내도서-경제경영')).toBe('경제/경영');
    expect(mapToMainCategory('국내도서-컴퓨터/IT')).toBe('컴퓨터/모바일');
    expect(mapToMainCategory('국내도서-에세이')).toBe('에세이');
  });
});

describe('mapYes24ItemList', () => {
  it('ISBN 없는 항목을 걸러내고 나머지를 옮긴다', () => {
    const result = mapYes24ItemList({
      items: [소년이온다, 세트상품],
      currentPage: 1,
      pageSize: 2,
      totalCount: 15,
    });

    expect(result.items).toHaveLength(1);
    // 걸러낸 뒤에도 totalCount 는 공급자가 말한 값 그대로다 — 페이지네이션이 이 값을 쓴다
    expect(result.totalResults).toBe(15);
    expect(result.page).toBe(1);
  });

  it('결과가 없어도 터지지 않는다', () => {
    const result = mapYes24ItemList({
      items: [],
      currentPage: 1,
      pageSize: 10,
      totalCount: 0,
    });

    expect(result.items).toEqual([]);
    expect(result.totalResults).toBe(0);
  });
});

describe('unwrapYes24Response', () => {
  it('성공이면 data를 꺼낸다', () => {
    expect(
      unwrapYes24Response({
        success: true,
        message: '성공',
        data: { ok: 1 },
        errorCode: null,
      })
    ).toEqual({ ok: 1 });
  });

  it('success가 false면 던진다', () => {
    // 이 assertion 이 잠그는 버그: YES24는 키가 만료돼도 HTTP 200에
    // success:false 로 답할 수 있다. 상태코드만 보고 넘기면 화면에는
    // "검색 결과 없음"이 뜨고 로그에는 아무것도 안 남는다.
    expect(() =>
      unwrapYes24Response({
        success: false,
        message: '인증 실패',
        data: null,
        errorCode: 'E401',
      })
    ).toThrow('인증 실패');
  });

  it('성공이라 해도 data가 없으면 던진다', () => {
    expect(() =>
      unwrapYes24Response({
        success: true,
        message: '성공',
        data: null,
        errorCode: null,
      })
    ).toThrow();
  });
});
