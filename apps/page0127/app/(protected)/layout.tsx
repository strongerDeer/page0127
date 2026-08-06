import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { ONBOARDING_PATH } from '@/shared/lib/auth/onboardingRedirect';

import { getProfile } from '@/entities/profile/api/getProfile';

import { AppShell } from '@/widgets/AppShell';

/**
 * 보호된 페이지 레이아웃 (로그인 필수)
 *
 * 학습 포인트:
 * - 인증 체크와 네비게이션을 AppShell(Server Component)에 위임
 * - 레이아웃은 셸로 children을 감싸기만 한다
 *
 * 온보딩 게이트도 여기 둔다. 콜백과 로그인 레이아웃이 이미 온보딩으로
 * 보내지만 **주소를 직접 치고 들어오는 경로**는 그 둘을 거치지 않는다.
 * 보호 라우트 전체가 이 레이아웃을 지나므로 한 곳에서 막을 수 있다.
 *
 * 온보딩 화면 자신은 `(onboarding)` 그룹에 있어 여기 걸리지 않는다 —
 * 같은 그룹에 뒀다면 자기 자신으로 무한히 리디렉션했을 것이다.
 */
const ProtectedLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인 여부 판단은 AppShell 이 갖는다(두 곳으로 갈리면 어긋난다).
  // 여기서는 로그인한 사람이 온보딩을 마쳤는지만 본다.
  if (user) {
    const profile = await getProfile(user.id);
    if (profile && !profile.onboarded_at) {
      redirect(ONBOARDING_PATH);
    }
  }

  return <AppShell>{children}</AppShell>;
};

export default ProtectedLayout;
