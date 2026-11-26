'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import type { ReactNode } from 'react';

type DemoAdminNavLinkProps = {
  href: string;
  label: string;
  /** 서버에서 그린 아이콘(JSX) — 아이콘 컴포넌트(함수)는 클라이언트 경계를 못 넘는다 */
  icon: ReactNode;
};

/** 데모 어드민 메뉴 한 칸 — 실제 AdminNavLink 와 같은 모양, 현재 주소만 브라우저에서 판단 */
export const DemoAdminNavLink = ({
  href,
  label,
  icon,
}: DemoAdminNavLinkProps) => {
  const pathname = usePathname();
  // '/demo/admin' 은 대시보드 — 그 아래 주소에서 켜지면 안 되므로 정확히 같을 때만
  const active =
    href === '/demo/admin' ? pathname === href : pathname.startsWith(href);
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
    </Link>
  );
};
