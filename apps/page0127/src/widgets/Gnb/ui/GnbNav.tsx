'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

// GNB 주 메뉴 — 활성 표시에 usePathname이 필요해서 이 부분만 Client
type GnbNavProps = {
  isLoggedIn: boolean;
};

type GnbLink = {
  href: string;
  label: string;
  /** true면 pathname이 정확히 일치할 때만 활성 (예: '/') */
  exact?: boolean;
};

export const GnbNav = ({ isLoggedIn }: GnbNavProps) => {
  const pathname = usePathname();

  const links: GnbLink[] = [
    { href: '/', label: '홈', exact: true },
    { href: '/books/all', label: '전체 도서' },
    // 피드는 로그인해야 볼 수 있는 영역이라 비로그인 방문자에겐 노출하지 않는다
    ...(isLoggedIn ? [{ href: '/feed', label: '피드' }] : []),
  ];

  return (
    <nav aria-label='주요 메뉴' className='hidden items-center gap-1 md:flex'>
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'text-text-strong'
                : 'text-text-subtle hover:text-text-strong'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};
