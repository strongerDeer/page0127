'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { isNavItemActive, navItems } from '../model/navItems';

export const BottomTabBar = () => {
  const pathname = usePathname();

  // 모바일 하단 탭바는 핵심 항목(primary)만 노출
  const items = navItems.filter((item) => item.primary);

  return (
    <nav className='fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card md:hidden'>
      {items.map((item) => {
        const active = isNavItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className='size-5' />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};
