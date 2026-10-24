import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getProfile } from '@/entities/profile/api/getProfile';

/**
 * 옛 경로 호환용 리다이렉트 — '내 서재'는 이제 /{username} 하나뿐이다.
 *
 * ⚠️ 로그인은 여기서 직접 확인한다. /dashboard 는 미들웨어의 보호 경로가 아니고
 * (protectedRoutes), (protected)/layout.tsx 도 비로그인을 막지 않는다(AppShell 이 화면만 바꾼다).
 * 소개 페이지의 로그인 버튼이 이리로 보내서, 로그아웃 상태로 들어오면 `user!.id` 가
 * 터졌다(Sentry PAGE0127-1V).
 */
const LegacyDashboardRedirect = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=%2Fdashboard');
  }

  const profile = await getProfile(user.id);

  if (!profile?.username) {
    redirect('/login');
  }

  redirect(`/${profile.username}`);
};

export default LegacyDashboardRedirect;
