import { BottomTabBar } from './BottomTabBar';
import { Sidebar } from './Sidebar';

import type { ShellUser } from '../api/getShellUser';

// 프레젠테이션 전용 셸 (인증 게이트 없음)
// - 인증/리디렉션은 호출하는 레이아웃이 책임지고, 여기선 화면 구성만 한다
// - 덕분에 보호 영역(AppShell)과 공개 영역(로그인 시) 모두 동일한 셸을 공유
type AppShellLayoutProps = ShellUser & {
  children: React.ReactNode;
};

export const AppShellLayout = ({
  userId,
  photoUrl,
  displayName,
  username,
  children,
}: AppShellLayoutProps) => {
  return (
    <div className='flex min-h-screen'>
      <Sidebar
        userId={userId}
        photoUrl={photoUrl}
        displayName={displayName}
        username={username}
      />
      {/* 모바일 하단 탭바 높이만큼 pb 확보 */}
      <main className='flex-1 pb-16 md:pb-0'>{children}</main>
      <BottomTabBar />
    </div>
  );
};
