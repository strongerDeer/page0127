import { NextRequest, NextResponse } from 'next/server';

import { getBookProvider } from '@/shared/api/book-provider';

/**
 * 도서 상세 조회 API Route
 *
 * ISBN13으로 쪽수·목차·책소개까지 받아 등록 폼과 AI 분석에 넘긴다.
 * 검색 응답에는 쪽수가 없어(공급자 공통) 상세 조회가 따로 필요하다.
 */
export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams.get('isbn');

  if (!isbn) {
    return NextResponse.json({ error: 'ISBN을 입력해주세요.' }, { status: 400 });
  }

  try {
    const book = await getBookProvider().getByIsbn(isbn);

    // 없는 ISBN 은 오류가 아니다 — 호출 측이 기본 정보로 진행할 수 있게 204 로 답한다
    if (!book) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error('도서 상세 정보 조회 실패:', error);
    return NextResponse.json(
      { error: '도서 상세 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
