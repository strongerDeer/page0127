import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';
import { toAuthErrorReason } from '@/shared/lib/auth/authErrorReason';
import { isBannedRedirect } from '@/shared/lib/auth/isBannedRedirect';
import { toSafeRedirect } from '@/shared/lib/auth/safeRedirect';

import { ensureProfile } from '@/entities/profile/api/getProfile';

/**
 * OAuth 콜백 라우트 (구글·카카오 공용)
 *
 * - 소셜 로그인 후 리디렉션되는 엔드포인트
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
      // user_metadata를 넘겨야 공급자가 준 이름·프로필 사진이 첫 프로필에 들어간다.
      // email 은 null 일 수 있다 — 카카오는 이메일 동의가 선택 항목이다.
      const profile = await ensureProfile(
        data.user.id,
        data.user.email ?? null,
        data.user.user_metadata
      );
      // next 는 사용자가 조작할 수 있는 값이다 — 외부 URL 이면 버리고 본인 서재로 보낸다
      const redirectTo = toSafeRedirect(next) ?? `/${profile.username}`;
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // 그 밖의 실패는 사유를 실어 안내 페이지로 보낸다.
  // 사유를 버리면 사용자가 스스로 취소한 경우에도 '오류'라고 말하게 된다.
  const reason = toAuthErrorReason(searchParams);
  return NextResponse.redirect(
    `${origin}/auth/auth-code-error?reason=${reason}`
  );
}
