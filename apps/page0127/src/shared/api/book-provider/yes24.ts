import { isValidIsbn13 } from '@/shared/lib/isbn';
import { normalizePubDate } from '@/shared/lib/pubDate';

import {
  buildYes24BackUrl,
  buildYes24CoverUrl,
  buildYes24SpineUrl,
} from './yes24Image';

import type {
  BookProvider,
  ProviderBook,
  ProviderSearchResult,
  SearchOptions,
} from './types';
import type {
  Yes24Item,
  Yes24ItemListData,
  Yes24ItemListResponse,
  Yes24Response,
} from '@/shared/types/yes24';

/**
 * YES24 공급자
 *
 * 알라딘 OpenAPI 종료(2026-10-30)에 따른 대체 공급자. Basic 등급 기준
 * 20,000건/일·10 RPS 이고 인증은 `X-Api-Key` 헤더다.
 *
 * 학습 포인트:
 * - 응답이 `{ success, data, errorCode }` 봉투에 싸여 있다. **HTTP 200이어도
 *   `success: false` 일 수 있으므로** 상태코드만 보고 성공으로 넘기면 안 된다
 */

const SEARCH_URL = 'https://apis.yes24.com/v1/goods/itemList';
const DETAIL_URL = 'https://apis.yes24.com/v1/goods/itemDetail';

/**
 * YES24 응답 한 건을 내부 형태로 옮긴다.
 *
 * 쓸 수 없는 ISBN이면 `null`. `global_books.isbn` 이 UNIQUE 키라 그대로 넣으면
 * 서로 다른 상품이 한 행으로 뭉개진다. 실측(480건)상 걸러지는 것은 세 종류다:
 *   - 세트 상품: `isbn13` 이 빈 문자열 (6.9%)
 *   - 잡지: `977` 로 시작하는 ISSN. 같은 번호가 여러 호에 붙는다 (5.2%)
 *   - 자리표시자: `9999999999999` 같은 값이 실제로 상품에 박혀 있다
 *
 * ⚠️ `spineImage`·`backImage` 는 **있을 것으로 기대하는 주소일 뿐** 실제로 존재하는지는
 * 모른다. YES24는 없는 이미지도 200에 플레이스홀더를 주므로, 저장 전에
 * `isYes24PlaceholderImage` 로 걸러야 한다. 그 판정은 이미지를 실제로 받아 보는
 * 백필 쪽에서 한다.
 */
/**
 * 치수(mm)를 옮긴다.
 *
 * **0 은 "없음"으로 눕힌다.** YES24 는 치수를 등록하지 않은 상품에 0 을 준다.
 * 그대로 저장하면 책장이 그 책을 두께 0mm 로 그려 선 하나로 사라진다 —
 * 값이 없을 때 그리는 기본 두께와 구분되지 않는다.
 *
 * ⚠️ 필드 대응: YES24 `height` 가 **두께**, `length` 가 판형 세로다.
 */
const toDimensions = (item: Yes24Item): ProviderBook['dimensions'] => {
  const mm = (value: number | null | undefined): number | null =>
    typeof value === 'number' && value > 0 ? value : null;

  const width = mm(item.width);
  const height = mm(item.length);
  const thickness = mm(item.height);

  if (width === null && height === null && thickness === null) return null;

  return { width, height, thickness };
};

export const mapYes24Book = (item: Yes24Item): ProviderBook | null => {
  const isbn = item.isbn13?.trim() ?? '';
  if (!isValidIsbn13(isbn)) return null;

  const itemId = String(item.itemId);

  return {
    isbn,
    title: item.title ?? '',
    // 부제는 대개 빈 문자열로 온다. 빈 문자열을 그대로 두면 화면이 빈 줄을 그리므로
    // null 로 눕힌다 — "값이 없다"를 한 가지 모양으로만 표현한다.
    subTitle: item.subTitle?.trim() || null,
    author: item.author ?? '',
    publisher: item.publisher ?? '',
    pubDate: normalizePubDate(item.publishDate),
    description: item.contentDetail?.bookIntroduction ?? '',
    category: item.goodsSortNm ?? '',
    coverImage: buildYes24CoverUrl(itemId),
    spineImage: buildYes24SpineUrl(itemId),
    backImage: buildYes24BackUrl(itemId),
    page: item.pages ?? null,
    toc: item.contentDetail?.tableOfContents ?? null,
    // ⚠️ YES24 는 `height` 가 **두께**다. 판형 세로는 `length` 다. 바꿔 넣기 쉬운 자리.
    dimensions: toDimensions(item),
    source: 'yes24',
    providerItemId: itemId,
    // 출처 링크 제공은 YES24 이용약관상 의무다. 응답에 없으면 상품번호로 만든다.
    providerLink: item.link || `https://www.yes24.com/product/goods/${itemId}`,
  };
};

export const mapYes24ItemList = (
  data: Yes24ItemListData
): ProviderSearchResult => ({
  items: (data.items ?? [])
    .map(mapYes24Book)
    .filter((book): book is ProviderBook => book !== null),
  totalResults: data.totalCount ?? 0,
  page: data.currentPage ?? 1,
});

/**
 * 봉투를 벗긴다. `success: false` 면 메시지를 실어 던진다.
 *
 * HTTP 200 + `success: false` 조합을 성공으로 넘기면, 화면에는 "검색 결과 없음"이
 * 뜨고 로그에는 아무것도 안 남는다 — 키가 만료돼도 그렇게 보인다.
 */
export const unwrapYes24Response = <T>(response: Yes24Response<T>): T => {
  if (!response.success || !response.data) {
    throw new Error(
      `YES24 API 오류: ${response.message || '알 수 없음'}` +
        (response.errorCode ? ` (${response.errorCode})` : '')
    );
  }
  return response.data;
};

const requireApiKey = (): string => {
  const key = process.env.YES24_API_KEY;
  if (!key) {
    throw new Error('YES24_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return key;
};

const callYes24 = async (
  url: string,
  params: URLSearchParams,
  revalidate: number,
  { notFoundAsNull = false } = {}
): Promise<Yes24ItemListData | null> => {
  const response = await fetch(`${url}?${params.toString()}`, {
    headers: { 'X-Api-Key': requireApiKey() },
    next: { revalidate },
  });

  // 없는 ISBN 은 404 로 온다. 그건 장애가 아니라 "그런 책이 없다" 이므로,
  // 500 으로 올려 보내면 화면에 "조회 실패" 가 뜨고 사용자는 재시도만 반복한다.
  if (notFoundAsNull && response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`YES24 API 오류: ${response.status}`);
  }

  return unwrapYes24Response((await response.json()) as Yes24ItemListResponse);
};

export const yes24Provider: BookProvider = {
  source: 'yes24',

  search: async (query, options: SearchOptions = {}) => {
    const { page = 1, maxResults = 10 } = options;

    const params = new URLSearchParams({
      query,
      category: 'BOOK',
      page: String(page),
      pageSize: String(maxResults),
    });

    // 같은 검색어+페이지 조합은 1시간 캐시 (일 20,000건 한도를 아낀다)
    const data = await callYes24(SEARCH_URL, params, 3600);

    // 검색에는 notFoundAsNull 을 쓰지 않으므로 null 이 올 수 없다
    return mapYes24ItemList(data!);
  },

  getByIsbn: async (isbn) => {
    const params = new URLSearchParams({
      searchType: 'ISBN13',
      query: isbn,
      // 쪽수와 판형(책 두께 포함)은 detail=Y 로만 온다
      detail: 'Y',
    });

    // 제목·저자·목차는 거의 변하지 않는다 → 24시간 캐시
    const data = await callYes24(DETAIL_URL, params, 86400, {
      notFoundAsNull: true,
    });

    const first = data?.items?.[0];

    return first ? mapYes24Book(first) : null;
  },
};
