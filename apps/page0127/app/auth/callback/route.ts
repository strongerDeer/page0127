import { type NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';
import { toAuthErrorReason } from '@/shared/lib/auth/authErrorReason';
import { isBannedRedirect } from '@/shared/lib/auth/isBannedRedirect';
import { toLinkFailurePath } from '@/shared/lib/auth/linkFlow';
import { toPostLoginPath } from '@/shared/lib/auth/onboardingRedirect';

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
      // 어디로 보낼지는 순수 함수가 정한다 — 온보딩 미완료면 next 보다 먼저다.
      // (next 가 외부 URL 인 경우도 그 안에서 걸러진다)
      const redirectTo = toPostLoginPath({
        username: profile.username,
        onboardedAt: profile.onboarded_at,
        next,
      });
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  // 계정 '연결'이 실패한 것이면 로그인 오류 페이지로 보내면 안 된다.
  // 사용자는 로그인이 아니라 연결을 하던 참이라 '로그인하지 못했어요' 는
  // 두 번 틀린 안내가 된다 — 하려던 일도, 원인도.
  // 시작한 자리인 설정 화면으로 돌려보내고 거기서 사정을 알린다.
  const linkFailurePath = toLinkFailurePath(next);
  if (linkFailurePath) {
    return NextResponse.redirect(`${origin}${linkFailurePath}`);
  }

  // 그 밖의 실패는 사유를 실어 안내 페이지로 보낸다.
  // 사유를 버리면 사용자가 스스로 취소한 경우에도 '오류'라고 말하게 된다.
  const reason = toAuthErrorReason(searchParams);
  return NextResponse.redirect(
    `${origin}/auth/auth-code-error?reason=${reason}`
  );
}
