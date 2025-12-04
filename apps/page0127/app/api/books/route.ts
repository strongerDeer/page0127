import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';

/**
 * GET /api/books
 * 책 목록 조회 (쿼리 파라미터로 필터링 가능)
 *
 * 학습 포인트:
 * - Next.js API Route: GET 메서드
 * - Query Parameter 처리
 * - Supabase 조건부 쿼리
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');

  // Supabase 쿼리 빌더
  let query = supabase.from('books').select('*').order('created_at', {
    ascending: false,
  });

  // 상태별 필터링 (선택적)
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/books
 * 새 책 추가
 *
 * 학습 포인트:
 * - Next.js API Route: POST 메서드
 * - Request Body 파싱
 * - 인증 확인 (user_id 자동 추가)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  // 현재 로그인한 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  // 책 추가 (user_id 자동 포함)
  const { data, error } = await supabase
    .from('books')
    .insert({
      ...body,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
