import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { toPostLoginPath } from '@/shared/lib/auth/onboardingRedirect';

import { ensureProfile } from '@/entities/profile/api/getProfile';

/**
 * 인증 페이지 레이아웃 (로그인, 회원가입 등)
 *
 * 학습 포인트:
 * - Route Group의 layout.tsx에서 접근 제어 처리
 * - 이미 로그인한 사용자는 본인 서재로 리디렉션
 * - 하위 모든 페이지에 자동 적용 (login, signup 등)
 */
const AuthLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 이미 로그인한 사용자는 되돌려 보낸다.
  // 어디로 갈지는 콜백과 **같은 판정**을 쓴다 — 온보딩을 안 마쳤으면
  // 여기서도 서재가 아니라 온보딩으로 가야 한다. 두 곳이 다르게 판단하면
  // 로그인 화면을 새로고침하는 것만으로 온보딩을 건너뛸 수 있다.
  if (user) {
    const profile = await ensureProfile(
      user.id,
      user.email ?? null,
      user.user_metadata
    );
    redirect(
      toPostLoginPath({
        username: profile.username,
        onboardedAt: profile.onboarded_at,
        next: null,
      })
    );
  }

  return <>{children}</>;
};

export default AuthLayout;
