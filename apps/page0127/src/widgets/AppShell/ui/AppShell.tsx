import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getShellUser } from '../api/getShellUser';
import { AppShellLayout } from './AppShellLayout';

// 보호된 영역의 앱 셸 (Server Component)
// - 인증 게이트: 비로그인 시 /login 리디렉션
// - 화면 구성은 AppShellLayout에 위임
export const AppShell = async ({ children }: { children: React.ReactNode }) => {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const shellUser = await getShellUser(user.id);

  return <AppShellLayout user={shellUser}>{children}</AppShellLayout>;
};
