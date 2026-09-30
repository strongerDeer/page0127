/**
 * 도서 공급자 공통 타입
 *
 * 왜 추상화하는가: 네이버 책 검색 API는 2026-07-31에, 알라딘 OpenAPI는
 * 2026-10-30에 종료된다(YES24로 옮긴 뒤 알라딘 어댑터는 걷어냈다). 공급자는 앞으로도 또 바뀐다는 전제로, 화면과 DB가
 * 특정 공급자의 응답 형태에 직접 묶이지 않게 한 겹 끼운다.
 *
 * 학습 포인트:
 * - 어댑터 패턴 — 서로 다른 외부 응답을 하나의 내부 형태(`ProviderBook`)로 맞춘다
 * - 교체 지점이 `getBookProvider()` 한 곳으로 모여, 공급자 교체가 import 변경이 된다
 */

/**
 * DB `global_books.source` 의 CHECK 제약과 값이 일치해야 한다.
 *
 * `'aladin'` 은 공급자가 사라져도 남긴다 — 알라딘에서 들어온 옛 행이 이 값을 갖고 있고,
 * 출처 표기(`toBookCredit`)가 그 행에 "알라딘"을 적는 데 쓴다.
 */
export const BOOK_SOURCES = ['aladin', 'yes24', 'manual'] as const;

export type BookSource = (typeof BOOK_SOURCES)[number];

/**
 * 공급자와 무관한 도서 표현
 *
 * 화면·DB가 보는 유일한 형태다. 공급자별 원본 필드는 어댑터 안에서만 존재한다.
 */
export type ProviderBook = {
  /** ISBN13. 세트 상품처럼 ISBN이 없는 항목은 애초에 걸러지므로 항상 값이 있다 */
  isbn: string;
  title: string;
  /**
   * 부제. 제목과 합치지 않고 따로 둔다 — 화면에서 둘째 줄에 작게 그린다.
   *
   * YES24는 `subTitle` 로 따로 준다. 공급자가 부제를 주지 않으면 null 이다.
   */
  subTitle: string | null;
  author: string;
  publisher: string;
  /** `YYYY-MM-DD` 로 정규화된 출간일. 저장 형식이 곧 표시 형식이라 되돌릴 필요가 없다 */
  pubDate: string | null;
  description: string;
  /** 공급자의 원본 분류 문자열. 대분류 변환은 `mapToMainCategory` 가 한다 */
  category: string;
  coverImage: string;
  /** 책등. 공급자가 주지 않으면 null 이다 */
  spineImage: string | null;
  /** 뒷표지. YES24만 제공한다 */
  backImage: string | null;
  page: number | null;
  toc: string | null;
  /**
   * 책 실물 치수(mm). 상세 조회에서만 온다.
   *
   * `thickness` 가 책등 두께다 — 책장 UI에서 책등 폭을 실물 비례로 그리는 데 쓴다.
   */
  dimensions: {
    width: number | null;
    height: number | null;
    thickness: number | null;
  } | null;
  source: BookSource;
  /**
   * 공급자 내부 상품번호.
   *
   * YES24는 이미지 URL이 ISBN이 아니라 이 번호로 만들어진다
   * (`image.yes24.com/goods/{itemId}/XL`). 한 번 받아 두면 영구히 유효하므로,
   * 공급자 API가 훗날 종료돼도 이미지는 계속 쓸 수 있다.
   */
  providerItemId: string | null;
  /** 공급자 상품 상세페이지. 출처 링크 제공은 YES24 이용약관상 의무다 */
  providerLink: string;
};

export type ProviderSearchResult = {
  items: ProviderBook[];
  totalResults: number;
  page: number;
};

export type SearchOptions = {
  page?: number;
  maxResults?: number;
};

/**
 * 공급자가 지켜야 할 계약
 *
 * 새 공급자를 붙일 때 이 형태만 맞추면 화면은 건드릴 필요가 없다.
 */
export type BookProvider = {
  readonly source: BookSource;
  search: (
    query: string,
    options?: SearchOptions
  ) => Promise<ProviderSearchResult>;
  getByIsbn: (isbn: string) => Promise<ProviderBook | null>;
};
