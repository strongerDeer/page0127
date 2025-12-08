import { NextResponse } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';

/**
 * API 인증 헬퍼 함수
 *
 * 학습 포인트:
 * - 공통 로직을 헬퍼로 분리하여 중복 제거
 * - 인증되지 않은 경우 401 응답 반환
 * - 성공 시 user 객체 반환
 *
 * @returns user 객체 또는 401 에러 응답
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * Supabase 클라이언트 생성
 *
 * 학습 포인트:
 * - 매번 createClient() 호출하는 보일러플레이트 제거
 * - 일관된 클라이언트 생성
 */
export async function getSupabaseClient() {
  return await createClient();
}
