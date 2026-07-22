import Link from 'next/link';

import { LayoutDashboard, Receipt, Users } from 'lucide-react';

// 이모지 대신 lucide 단색 아이콘, 입체는 1px 선으로만 표현한다.
const NAV = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/costs', label: 'AI 비용', icon: Receipt },
  { href: '/admin/members', label: '회원 관리', icon: Users },
];

export const AdminNav = () => {
  return (
    <nav className='flex flex-col gap-1 p-4'>
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className='flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent'
        >
          <Icon className='h-4 w-4' aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
};
