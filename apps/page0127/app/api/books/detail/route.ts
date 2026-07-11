import { NextRequest, NextResponse } from 'next/server';

const ALADIN_API_KEY = process.env.ALADIN_API_KEY ?? process.env.NEXT_PUBLIC_ALADIN_API_KEY;
const ALADIN_API_BASE_URL = 'http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';

/**
 * 알라딘 도서 상세 조회 API Route
 *
 * 학습 포인트:
 * - ItemLookUp API: ISBN으로 상세 정보 조회 (쪽수, 목차 포함)
 * - OptResult: packing, toc, fulldescription - AI 분석용 추가 정보
 * - ItemSearch API와 다른 엔드포인트
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const isbn = searchParams.get('isbn');

  if (!isbn) {
    return NextResponse.json(
      { error: 'ISBN을 입력해주세요.' },
      { status: 400 }
    );
  }

  // 알라딘 API 쿼리 파라미터 생성
  const params = new URLSearchParams({
    ttbkey: ALADIN_API_KEY!,
    ItemId: isbn,
    ItemIdType: 'ISBN13',
    output: 'js',
    Version: '20131101',
    Cover: 'Big', // 큰 표지 이미지 요청
    // AI 분석을 위한 추가 정보 요청
    // packing: subInfo(쪽수 등), toc: 목차, fulldescription: 전체 소개, authors: 저자 소개
    OptResult: 'packing,toc,fulldescription,authors',
  });

  const url = `${ALADIN_API_BASE_URL}?${params.toString()}`;

  try {
    // 도서 상세 정보(제목, 저자, 목차)는 거의 변하지 않음 → 24시간 캐시
    const response = await fetch(url, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(`알라딘 API 오류: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('알라딘 API 요청 실패:', error);
    return NextResponse.json(
      { error: '도서 상세 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
