/**
 * YES24 Open API 응답 타입
 *
 * 2026-09-28 실호출 응답을 기준으로 적었다 (문서보다 응답이 더 많이 준다 —
 * 예를 들어 목차는 별도 API로 문서화돼 있지만 검색 응답에도 딸려 온다).
 *
 * 학습 포인트:
 * - FSD 구조: shared 레이어는 entities를 import할 수 없어 외부 API 타입은 shared에 둔다
 * - 응답 전체가 `{ success, data, errorCode }` 봉투에 싸여 있다 — HTTP 200이어도
 *   `success: false`일 수 있으므로 상태코드만 보고 판단하면 안 된다
 */

/** 검색·상세 공통 항목 */
export type Yes24Item = {
  /** YES24 상품번호. **숫자로 온다** — 이미지 URL을 만들 때 문자열로 바꿔 쓴다 */
  itemId: number;
  title: string;
  /** 부제. 알라딘은 제목에 `- 부제`를 붙여 줬지만 YES24는 따로 준다 */
  subTitle?: string;
  author: string;
  publisher: string;
  /** 분류. `국내도서-소설/시/희곡` 형태 (알라딘은 `국내도서>...`) */
  goodsSortNm: string;
  isbn10: string;
  /** **세트 상품은 빈 문자열이다** — ISBN이 UNIQUE 키라 걸러내야 한다 */
  isbn13: string;
  /** `20140519` 형태 */
  publishDate: string;
  link: string;
  /** 표지 URL. `.../goods/{itemId}/L` 로 오므로 크기를 올리려면 직접 조립한다 */
  cover: string;
  itemStatus?: string;

  /** 아래는 `detail=Y` 로 상세 조회했을 때만 온다 */
  pages?: number | null;
  /** 책 두께(mm). 책장 UI에서 책등 폭을 실물 비례로 그리는 데 쓸 수 있다 */
  height?: number | null;
  /** 판형 가로(mm) */
  width?: number | null;
  /** 판형 세로(mm) */
  length?: number | null;
  weight?: number | null;

  contentDetail?: {
    bookIntroduction?: string | null;
    bookSummary?: string | null;
    tableOfContents?: string | null;
  } | null;
};

/** `{ success, data, errorCode }` 봉투 */
export type Yes24Response<TData> = {
  success: boolean;
  message: string;
  data: TData | null;
  errorCode: string | null;
};

export type Yes24ItemListData = {
  items: Yes24Item[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
};

export type Yes24ItemListResponse = Yes24Response<Yes24ItemListData>;
