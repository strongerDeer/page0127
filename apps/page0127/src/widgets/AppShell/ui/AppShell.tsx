import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

import { BottomTabBar } from './BottomTabBar';
import { Sidebar } from './Sidebar';

// 보호된 영역의 앱 셸 (Server Component)
// - 인증·프로필 데이터를 한 번 가져와 Client 네비게이션에 내려준다
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

  const profile = await getProfile(user.id);

  return (
    <div className='flex min-h-screen'>
      <Sidebar
        userId={user.id}
        photoUrl={profile?.photo_url ?? null}
        displayName={profile?.nickname || profile?.email || '사용자'}
        username={profile?.username ?? null}
      />
      {/* 모바일 하단 탭바 높이만큼 pb 확보 */}
      <main className='flex-1 pb-16 md:pb-0'>{children}</main>
      <BottomTabBar />
    </div>
  );
};
