import { NextRequest, NextResponse } from 'next/server';

import { getBookProvider } from '@/shared/api/book-provider';
import { toManualProviderBook } from '@/shared/api/book-provider/manualCatalog';
import { quotePostgrestValue } from '@/shared/lib/postgrestFilter';

import { getSupabaseClient } from '../../_helpers/auth';

/**
 * 도서 검색 API Route
 *
 * 학습 포인트:
 * - Next.js API Route Handler (App Router)
 * - CORS 문제 해결: 서버에서 외부 API 호출 (API 키도 서버에만 둔다)
 * - 공급자(현재 YES24)는 `getBookProvider()` 가 고른다 — 이 파일은 누가
 *   답하는지 모른다. 공급자 종료 같은 사건이 라우트까지 번지지 않게 하는 경계다.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(searchParams.get('page') ?? '', 10) || 1)
  );
  const maxResults = Math.max(
    1,
    Math.min(
      50,
      Number.parseInt(searchParams.get('maxResults') ?? '', 10) || 10
    )
  );

  if (!query?.trim()) {
    return NextResponse.json(
      { error: '검색어를 입력해주세요.' },
      { status: 400 }
    );
  }

  try {
    const providerResult = getBookProvider()
      .search(query, { page, maxResults })
      .then(
        (value) => ({ value, error: null }),
        (error: unknown) => ({ value: null, error })
      );
    const catalog = await searchApprovedCatalog(query, page, maxResults);
    const provider = await providerResult;
    // 서점이 실패했고 보여 줄 직접 등록 도서도 없을 때만 검색 실패다.
    // 한쪽만 실패하면 남은 쪽 결과를 보여 준다.
    if (provider.error && !catalog.count) throw provider.error;
    if (provider.error)
      console.error(
        '서점 검색 실패, 승인된 직접 등록 도서만 표시:',
        provider.error
      );
    if (catalog.error)
      console.error(
        '직접 등록 도서 검색 실패, 서점 결과만 표시:',
        catalog.error
      );
    return NextResponse.json({
      ...(provider.value ?? { items: [], totalResults: 0, page }),
      catalogTotalResults: catalog.count,
      catalogItems: catalog.items,
    });
  } catch (error) {
    // 키 누락·공급자 장애·응답 형식 변경이 모두 여기로 모인다. 사용자에게는
    // 같은 문구를 보이되 원인은 로그에 남긴다 — 조용히 빈 결과를 주면
    // "검색 결과 없음"과 구분되지 않는다.
    console.error('도서 검색 실패:', error);
    return NextResponse.json(
      { error: '도서 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 승인된 직접 등록 도서(global_books, source=manual) 검색.
 *
 * 서점 검색의 "덤"이라 여기서 실패해도 검색 전체를 실패시키지 않는다 — 에러를 던지지 않고
 * 돌려준다(장애 격리). 서점 검색이 실패하면 이쪽만 보여 주는 것과 대칭이다.
 *
 * ⚠️ PostgREST 는 행 수보다 큰 offset 을 요청하면 빈 배열이 아니라
 * PGRST103(HTTP 416 Requested range not satisfiable) 에러를 낸다. 직접 등록 도서가
 * 0~10권일 때 서점 결과 2페이지(offset 10)를 넘기면 늘 여기에 걸리므로 "빈 결과"로 본다.
 */
const RANGE_NOT_SATISFIABLE = 'PGRST103';

type CatalogResult = {
  items: ReturnType<typeof toManualProviderBook>[];
  count: number;
  error: unknown;
};

async function searchApprovedCatalog(
  query: string,
  page: number,
  maxResults: number
): Promise<CatalogResult> {
  try {
    const client = await getSupabaseClient();
    const pattern = quotePostgrestValue(`%${query.trim().slice(0, 200)}%`);
    const { data, error, count } = await client
      .from('global_books')
      .select('isbn,title,author,publisher,source_url,cover_image', {
        count: 'exact',
      })
      .eq('source', 'manual')
      .eq('review_status', 'approved')
      .or(
        `title.ilike.${pattern},author.ilike.${pattern},isbn.eq.${quotePostgrestValue(query.trim())}`
      )
      .order('created_at', { ascending: false })
      .range((page - 1) * maxResults, page * maxResults - 1);

    if (error?.code === RANGE_NOT_SATISFIABLE) {
      return { items: [], count: count ?? 0, error: null };
    }
    if (error) return { items: [], count: 0, error };
    return {
      items: (data ?? []).map(toManualProviderBook),
      count: count ?? 0,
      error: null,
    };
  } catch (error) {
    return { items: [], count: 0, error };
  }
}
