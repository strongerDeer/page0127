import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';
import { isBannedRedirect } from '@/shared/lib/auth/isBannedRedirect';

import { ensureProfile } from '@/entities/profile/api/getProfile';

/**
 * Google OAuth 콜백 라우트
 *
 * - Supabase Google OAuth 로그인 후 리디렉션되는 엔드포인트
 * - code를 세션으로 교환하여 인증 완료
 * - 첫 로그인이면 프로필(+username)을 먼저 만들고, 본인 서재로 리디렉션
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  // 정지(ban)된 계정은 code 없이 error_code=user_banned 로 돌아온다
  // → 일반 인증 오류가 아니라 정지 안내로 보낸다
  if (isBannedRedirect(searchParams)) {
    return NextResponse.redirect(`${origin}/auth/suspended`);
  }

  if (code) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const profile = await ensureProfile(data.user.id, data.user.email!);
      const redirectTo = next ?? `/${profile.username}`;
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // 그 밖의 에러는 일반 인증 오류 페이지로
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
