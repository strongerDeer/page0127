'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { NotificationDropdown } from '@/features/notification';
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
        <Link href='/dashboard' className='text-lg font-bold text-primary'>
          page0127
        </Link>
      </div>

      {/* 메뉴 */}
      <nav className='flex-1 space-y-1 px-3 py-2'>
        {navItems.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className='size-4' />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단: 알림 + 프로필 */}
      <div className='flex items-center justify-between border-t border-sidebar-border px-4 py-3'>
        <ProfileDropdown
          photoUrl={photoUrl}
          displayName={displayName}
          username={username}
        />
        <NotificationDropdown userId={userId} />
      </div>
    </aside>
  );
};
