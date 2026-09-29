import { NextRequest } from 'next/server';

import { createActivity } from '../_helpers/activity';
import { getCurrentUser, getSupabaseClient } from '../_helpers/auth';
import { errorResponse, successResponse } from '../_helpers/response';
import {
  hasLifeBookReading,
  syncLifeBookAcrossReadings,
} from '../_helpers/syncLifeBookAcrossReadings';

/**
 * GET /api/books
 * 책 목록 조회 (쿼리 파라미터로 필터링 가능)
 *
 * 학습 포인트:
 * - 공통 헬퍼로 깔끔한 코드
 * - Query Parameter 처리
 * - Supabase 조건부 쿼리
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const isbn = searchParams.get('isbn');
    const providerItemId = searchParams.get('providerItemId');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const order = searchParams.get('order') || 'desc';

    // Supabase 쿼리 빌더
    let query = supabase.from('books').select('*');

    // 로그인한 사용자의 책만 조회
    if (user.user) {
      query = query.eq('user_id', user.user.id);
    }

    // 중복 등록 체크용 필터.
    //
    // ⚠️ isbn 만 보면 안 된다. `books.isbn` 은 ISBN13 이 아닐 수 있다 — 알라딘 시절
    // 응답의 `isbn` 을 그대로 저장해 와서 ISBN10 과 K코드가 섞여 있다. 그래서
    // K코드로 담아 둔 책을 검색으로 다시 담으면(공급자는 ISBN13 을 준다) isbn 이
    // 달라 "이미 등록한 책" 경고가 뜨지 않고 **쌍둥이 행**이 생긴다.
    // 2026-09-29 운영에서 실제로 3권이 그렇게 갈라져 있었다.
    //
    // 상품번호가 같으면 같은 상품이므로, 둘 중 하나라도 맞으면 기존 책으로 본다.
    if (isbn && providerItemId) {
      query = query.or(`isbn.eq.${isbn},provider_item_id.eq.${providerItemId}`);
    } else if (isbn) {
      query = query.eq('isbn', isbn);
    } else if (providerItemId) {
      query = query.eq('provider_item_id', providerItemId);
    }

    // 상태별 필터링 (선택적)
    if (status) {
      query = query.eq('status', status);
    }

    // 정렬 적용
    query = query.order(sortBy, { ascending: order === 'asc' });

    const { data, error } = await query;

    if (error) return errorResponse(error.message);

    return successResponse(data);
  } catch {
    return errorResponse('책 목록 조회에 실패했습니다.');
  }
}

/**
 * POST /api/books
 * 새 책 추가
 *
 * 학습 포인트:
 * - 공통 헬퍼로 중복 제거
 * - 인증 확인 간소화
 * - 책 추가 시 활동 자동 생성
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const body = await request.json();

    // 인증 확인 (헬퍼 사용)
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    // 1. global_books에 책이 없으면 추가 (ISBN 기준)
    // ON CONFLICT DO NOTHING을 사용하여 이미 존재하면 무시
    const { error: globalError } = await supabase
      .from('global_books')
      .insert({
        isbn: body.isbn,
        title: body.title,
        sub_title: body.sub_title,
        source: body.source,
        provider_item_id: body.provider_item_id,
        author: body.author,
        publisher: body.publisher,
        cover_image: body.cover_image,
        spine_image: body.spine_image,
        description: body.description,
        pub_date: body.pub_date,
        category: body.category,
      })
      .select()
      .single();

    // global_books 에러는 무시하고 진행 (이미 존재하는 경우 등)
    if (globalError && globalError.code !== '23505') {
      console.error('Failed to sync global book:', globalError);
    }

    // 2. 사용자 책장에 추가
    //
    // 인생책은 '책' 단위 속성이라 재독을 담을 때 양쪽을 맞춰야 한다.
    // - 1회독 때 꼽아뒀으면 등록 폼 체크가 꺼져 있어도 새 회독은 인생책이다
    // - 이번에 꼽았으면 아래에서 기존 회독들에도 반영한다
    const isLifeBook =
      body.is_life_book === true ||
      (await hasLifeBookReading(supabase, user!.id, body.isbn));

    const { data, error } = await supabase
      .from('books')
      .insert({
        ...body,
        is_life_book: isLifeBook,
        user_id: user!.id,
      })
      .select()
      .single();

    if (error) return errorResponse(error.message);

    if (isLifeBook) {
      await syncLifeBookAcrossReadings({
        supabase,
        userId: user!.id,
        isbn: data.isbn,
        isLifeBook: true,
        exceptBookId: data.id,
      });
    }

    // 3. 활동 생성
    // 담는 순간 이미 완독이면 "완독했어요"가 사실에 가깝다. 담기와 완독을 둘 다 남기면
    // 같은 시각에 두 줄이 겹쳐 스트림만 지저분해진다(PATCH의 완독 처리와 같은 규칙).
    await createActivity({
      supabase,
      userId: user!.id,
      bookId: data.id,
      activityType:
        body.status === 'completed' ? 'book_completed' : 'book_added',
    });

    return successResponse(data, 201);
  } catch {
    return errorResponse('책 추가에 실패했습니다.');
  }
}
