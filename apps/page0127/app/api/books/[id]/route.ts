import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/books/:id
 * 특정 책 상세 조회
 *
 * 학습 포인트:
 * - Dynamic Route Parameter 처리
 * - 404 에러 처리
 */
export async function GET(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/books/:id
 * 책 정보 수정
 *
 * 학습 포인트:
 * - PATCH vs PUT: 부분 수정
 * - updated_at 자동 업데이트
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from('books')
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/books/:id
 * 책 삭제
 *
 * 학습 포인트:
 * - DELETE 메서드
 * - 204 vs 200 응답 (여기서는 200 + 메시지)
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase.from('books').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: '삭제되었습니다.' });
}
