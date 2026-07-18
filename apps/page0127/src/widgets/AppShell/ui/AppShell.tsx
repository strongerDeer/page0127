import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getShellUser } from '../api/getShellUser';
import { AppShellLayout } from './AppShellLayout';

// 보호된 영역의 앱 셸 (Server Component)
// - 인증 게이트: 비로그인 시 /login 리디렉션
// - 화면 구성은 AppShellLayout에 위임
export const AppShell = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const shellUser = await getShellUser(user.id);

  return <AppShellLayout user={shellUser}>{children}</AppShellLayout>;
};
