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
    const client = await getSupabaseClient();
    const pattern = quotePostgrestValue(`%${query.trim().slice(0, 200)}%`);
    const {
      data: catalog,
      error,
      count,
    } = await client
      .from('global_books')
      .select('isbn,title,author,publisher,source_url', { count: 'exact' })
      .eq('source', 'manual')
      .eq('review_status', 'approved')
      .or(
        `title.ilike.${pattern},author.ilike.${pattern},isbn.eq.${quotePostgrestValue(query.trim())}`
      )
      .order('created_at', { ascending: false })
      .range((page - 1) * maxResults, page * maxResults - 1);
    const provider = await providerResult;
    if (error) throw error;
    if (provider.error && !count) throw provider.error;
    if (provider.error)
      console.error(
        '서점 검색 실패, 승인된 직접 등록 도서만 표시:',
        provider.error
      );
    return NextResponse.json({
      ...(provider.value ?? { items: [], totalResults: 0, page }),
      catalogTotalResults: count ?? 0,
      catalogItems: (catalog ?? []).map(toManualProviderBook),
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
