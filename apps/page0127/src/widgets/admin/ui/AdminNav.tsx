import Link from 'next/link';

import {
  Bug,
  Flag,
  Gauge,
  ImageIcon,
  LayoutDashboard,
  LineChart,
  Receipt,
  Users,
} from 'lucide-react';

// 이모지 대신 lucide 단색 아이콘, 입체는 1px 선으로만 표현한다.
const NAV = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/quality', label: '품질', icon: Gauge },
  { href: '/admin/errors', label: '에러', icon: Bug },
  { href: '/admin/reports', label: '신고', icon: Flag },
  { href: '/admin/analytics', label: '유입분석', icon: LineChart },
  { href: '/admin/costs', label: 'AI 비용', icon: Receipt },
  { href: '/admin/members', label: '회원 관리', icon: Users },
  { href: '/admin/banners', label: '메인 배너', icon: ImageIcon },
];

export const AdminNav = () => {
  return (
    // 모바일은 가로로 스크롤되는 한 줄, md 이상은 세로 목록
    <nav className='flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:p-4'>
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className='flex shrink-0 items-center gap-2 whitespace-nowrap rounded px-3 py-2 text-sm hover:bg-accent'
        >
          <Icon className='h-4 w-4' aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
};
