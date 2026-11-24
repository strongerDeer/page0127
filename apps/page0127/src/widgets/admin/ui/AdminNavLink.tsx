'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { formatAdminBadge, isActiveAdminHref } from '../model/adminNav';

import type { AdminNavItem } from '../model/adminNav';
import type { ReactNode } from 'react';

type AdminNavLinkProps = {
  href: AdminNavItem['href'];
  label: AdminNavItem['label'];
  /**
   * 서버에서 이미 그린 아이콘(JSX). 아이콘 "컴포넌트"(함수)를 넘기면 안 된다 —
   * 서버 → 클라이언트 경계로는 직렬화할 수 있는 값(JSX·문자열·숫자)만 건널 수 있다.
   * (2026-11-24 운영 /admin 500: "Functions cannot be passed directly to Client Components")
   */
  icon: ReactNode;
  count?: number;
};

/**
 * 메뉴 링크 한 칸. 현재 주소는 브라우저만 알아서(usePathname) 이 조각만 클라이언트 컴포넌트다.
 * 메뉴 목록·묶음은 서버 컴포넌트(AdminNav)에 남겨 번들을 작게 둔다.
 */
export const AdminNavLink = ({
  href,
  label,
  icon,
  count,
}: AdminNavLinkProps) => {
  const pathname = usePathname();
  const active = isActiveAdminHref(pathname, href);
  const badge = formatAdminBadge(count);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-sm hover:bg-accent',
        active && 'bg-accent font-medium'
      )}
    >
      {icon}
      {label}
      {badge && (
        <span className='ml-auto min-w-5 rounded-full bg-destructive px-1.5 text-center text-xs font-medium leading-5 text-white tabular-nums'>
          {badge}
          <span className='sr-only'>건 대기</span>
        </span>
      )}
    </Link>
  );
};
