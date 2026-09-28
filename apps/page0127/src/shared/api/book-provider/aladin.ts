import { upgradeImageResolution } from '@/shared/lib/imageUtils';
import { isValidIsbn13 } from '@/shared/lib/isbn';
import { normalizePubDate } from '@/shared/lib/pubDate';

import type {
  BookProvider,
  ProviderBook,
  ProviderSearchResult,
  SearchOptions,
} from './types';
import type {
  AladinBook,
  AladinBookDetail,
  AladinLookUpResponse,
  AladinSearchResponse,
} from '@/shared/types/aladin';

/**
 * 알라딘 공급자
 *
 * ⚠️ 2026-10-30 에 알라딘 OpenAPI 가 종료된다. 이 어댑터는 그때까지의 폴백이자,
 * 종료 전에 기존 도서를 백필할 마지막 통로다. 새 기능을 여기에 붙이지 말 것.
 *
 * 학습 포인트:
 * - 매핑 함수를 fetch 와 분리해 두면 네트워크 없이 단위 테스트할 수 있다
 */

const SEARCH_URL = 'https://www.aladin.co.kr/ttb/api/ItemSearch.aspx';
const LOOKUP_URL = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';

const isDetail = (item: AladinBook | AladinBookDetail): item is AladinBookDetail =>
  'toc' in item || 'fullDescription' in item;

/**
 * 표지 URL에서 책등(spineflip) 주소를 만든다. 만들 수 없으면 `null`.
 *
 * 알라딘은 책등 주소를 응답에 주지 않아 표지 URL에서 유도해야 한다.
 *   표지: https://image.aladin.co.kr/product/4086/97/cover200/8936434128_2.jpg
 *   책등: https://image.aladin.co.kr/product/4086/97/spineflip/8936434128_d.jpg
 *
 * 파일명 앞부분이 ISBN10 이라 거기서 잘라 쓴다. 실제로 존재하는지는 모르므로
 * (알라딘은 없으면 404 를 준다) 화면에서 `resolveSpineImageUrl` 이 확인한다.
 */
export const deriveAladinSpineUrl = (coverUrl: string): string | null => {
  const parts = coverUrl.split('cover200');
  if (parts.length < 2) return null;

  const fileName = parts[1].split('_')[0];
  if (!fileName) return null;

  return `${parts[0]}spineflip${fileName}_d.jpg`;
};

/**
 * 알라딘 응답 한 건을 내부 형태로 옮긴다.
 *
 * ISBN13 이 없으면 `null` 을 돌려준다 — `global_books.isbn` 이 UNIQUE 키라
 * 빈 ISBN 을 넣으면 서로 다른 책이 한 행으로 뭉개진다.
 */
export const mapAladinBook = (
  item: AladinBook | AladinBookDetail
): ProviderBook | null => {
  const isbn = item.isbn13?.trim() ?? '';
  if (!isValidIsbn13(isbn)) return null;

  const detail = isDetail(item) ? item : null;

  return {
    isbn,
    title: item.title ?? '',
    // 알라딘은 제목 안에 ` - 부제` 로 붙여 준다. 임의로 자르면 제목에 하이픈이 든
    // 책("나-너-우리" 같은)이 잘리므로 분리하지 않는다.
    subTitle: null,
    author: item.author ?? '',
    publisher: item.publisher ?? '',
    pubDate: normalizePubDate(item.pubDate),
    // 상세 조회에서는 fullDescription 이 더 길다. 없으면 목록용 description 으로 떨어진다
    description: detail?.fullDescription || item.description || '',
    category: item.categoryName ?? '',
    // 알라딘은 Cover=Big 을 줘도 cover200 을 내려준다 — 화면에 쓰기 전에 올려 둔다
    coverImage: item.cover ? upgradeImageResolution(item.cover) : '',
    // 응답에 없어 표지 URL에서 유도한다. 실재 여부는 화면에서 확인한다.
    spineImage: item.cover ? deriveAladinSpineUrl(item.cover) : null,
    // 알라딘은 뒷표지를 제공하지 않는다
    backImage: null,
    page: item.subInfo?.itemPage ?? null,
    toc: detail?.toc ?? null,
    // 알라딘은 책 실물 치수를 주지 않는다
    dimensions: null,
    source: 'aladin',
    providerItemId: null,
    providerLink: item.link ?? '',
  };
};

/** ISBN 이 없는 항목(세트 상품 등)은 조용히 빠진다 — totalResults 와 items.length 가 다를 수 있다 */
export const mapAladinSearchResponse = (
  response: AladinSearchResponse,
  page: number
): ProviderSearchResult => ({
  items: (response.item ?? [])
    .map(mapAladinBook)
    .filter((book): book is ProviderBook => book !== null),
  totalResults: response.totalResults ?? 0,
  page,
});

export const mapAladinLookUpResponse = (
  response: AladinLookUpResponse
): ProviderBook | null => {
  const first = response.item?.[0];
  return first ? mapAladinBook(first) : null;
};

const requireApiKey = (): string => {
  const key = process.env.ALADIN_API_KEY;
  if (!key) {
    throw new Error('ALADIN_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return key;
};

export const aladinProvider: BookProvider = {
  source: 'aladin',

  search: async (query, options: SearchOptions = {}) => {
    const { page = 1, maxResults = 10 } = options;

    const params = new URLSearchParams({
      ttbkey: requireApiKey(),
      Query: query,
      QueryType: 'Title',
      MaxResults: String(maxResults),
      start: String(page),
      SearchTarget: 'Book',
      output: 'js',
      Version: '20131101',
      Cover: 'Big',
      OptResult: 'packing',
    });

    // 같은 검색어+페이지 조합은 1시간 캐시 (호출량 절감)
    const response = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`알라딘 API 오류: ${response.status}`);
    }

    return mapAladinSearchResponse(
      (await response.json()) as AladinSearchResponse,
      page
    );
  },

  getByIsbn: async (isbn) => {
    const params = new URLSearchParams({
      ttbkey: requireApiKey(),
      ItemId: isbn,
      ItemIdType: 'ISBN13',
      output: 'js',
      Version: '20131101',
      Cover: 'Big',
      OptResult: 'packing,toc,fulldescription,authors',
    });

    // 제목·저자·목차는 거의 변하지 않는다 → 24시간 캐시
    const response = await fetch(`${LOOKUP_URL}?${params.toString()}`, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(`알라딘 API 오류: ${response.status}`);
    }

    return mapAladinLookUpResponse(
      (await response.json()) as AladinLookUpResponse
    );
  },
};
