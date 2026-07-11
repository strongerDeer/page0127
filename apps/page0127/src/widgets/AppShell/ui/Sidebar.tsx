'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Globe } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import { NotificationBadge } from '@/features/notification';
import { ProfileDropdown } from '@/features/profile';

import { isNavItemActive, navItems } from '../model/navItems';

// Server인 AppShell이 인증·프로필 데이터를 원시값으로 내려준다
type SidebarProps = {
  userId: string;
  photoUrl: string | null;
  displayName: string;
  username: string | null;
};

export const Sidebar = ({
  userId,
  photoUrl,
  displayName,
  username,
}: SidebarProps) => {
  // 현재 경로로 활성 메뉴 표시 (Client 훅)
  const pathname = usePathname();

  return (
    <aside className='hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex'>
      {/* 로고 */}
      <div className='flex h-16 items-center px-5'>
        <Link href='/' className='text-lg font-bold text-primary'>
          page0127
        </Link>
      </div>

      {/* 메뉴 */}
      {/* aria-label: 스크린 리더가 여러 nav(사이드바/하단탭/헤더)를 구분하도록 이름 부여 */}
      <nav aria-label='주요 메뉴' className='flex-1 space-y-1 px-3 py-2'>
        {navItems.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              // aria-current='page': 색상뿐 아니라 스크린 리더에도 "현재 페이지"임을 전달
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              )}
            >
              {/* 라벨 텍스트가 이미 있으므로 아이콘은 장식 → 스크린 리더에서 숨김 */}
              <Icon aria-hidden='true' className='size-4' />
              {item.label}
              {/* 알림 메뉴에만 안 읽은 개수 뱃지 표시 */}
              {item.href === '/notifications' && (
                <NotificationBadge userId={userId} />
              )}
            </Link>
          );
        })}

        {/* 공개 서재 — username이 있을 때만, 주소가 사용자마다 다르므로 별도 렌더 */}
        {username && (
          <Link
            href={`/${username}`}
            aria-current={
              isNavItemActive(pathname, `/${username}`) ? 'page' : undefined
            }
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isNavItemActive(pathname, `/${username}`)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
            )}
          >
            <Globe aria-hidden='true' className='size-4' />
            공개 서재
          </Link>
        )}
      </nav>

      {/* 하단: 프로필 */}
      <div className='flex items-center border-t border-sidebar-border px-4 py-3'>
        <ProfileDropdown
          photoUrl={photoUrl}
          displayName={displayName}
          username={username}
        />
      </div>
    </aside>
  );
};
