import { NextRequest, NextResponse } from 'next/server';

const ALADIN_API_KEY = process.env.NEXT_PUBLIC_ALADIN_API_KEY;
const ALADIN_API_BASE_URL = 'http://www.aladin.co.kr/ttb/api/ItemSearch.aspx';

/**
 * 알라딘 도서 검색 API Route
 *
 * 학습 포인트:
 * - Next.js API Route Handler (App Router)
 * - CORS 문제 해결: 서버에서 외부 API 호출
 * - GET 요청 처리
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const page = searchParams.get('page') || '1';
  const maxResults = searchParams.get('maxResults') || '10';

  if (!query) {
    return NextResponse.json(
      { error: '검색어를 입력해주세요.' },
      { status: 400 }
    );
  }

  // 알라딘 API 쿼리 파라미터 생성
  const params = new URLSearchParams({
    ttbkey: ALADIN_API_KEY!,
    Query: query,
    QueryType: 'Title',
    MaxResults: maxResults,
    start: page,
    SearchTarget: 'Book',
    output: 'js',
    Version: '20131101',
    Cover: 'Big', // 큰 표지 이미지 요청
    OptResult: 'packing', // subInfo(쪽수 등) 정보 포함
  });

  const url = `${ALADIN_API_BASE_URL}?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`알라딘 API 오류: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('알라딘 API 요청 실패:', error);
    return NextResponse.json(
      { error: '도서 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
