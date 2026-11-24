import {
  BookCheck,
  BookOpenText,
  Bug,
  Flag,
  Gauge,
  ImageIcon,
  LayoutDashboard,
  LineChart,
  Quote,
  Receipt,
  Users,
} from 'lucide-react';

import { AdminNavLink } from './AdminNavLink';

import type { AdminNavBadges, AdminNavGroup } from '../model/adminNav';

/**
 * 메뉴는 "자주 여는 순서"로 묶는다 — 만든 순서대로 붙이면 제일 많이 보는 유입분석이 뒤로 밀린다.
 * 품질·에러·AI 비용은 맨 아래 "점검"에 둔다. 회귀·예산 초과·대기 신고는
 * 대시보드 "오늘 볼 것"(admin-overview/lib/attention.ts)이 먼저 띄워 주니 메뉴 위치로 챙길 필요가 없다.
 *
 * 이모지 대신 lucide 단색 아이콘, 입체는 1px 선으로만 표현한다.
 */
const NAV_GROUPS: AdminNavGroup[] = [
  {
    label: '자주 보는 곳',
    items: [
      { href: '/admin/analytics', label: '유입분석', icon: LineChart },
      { href: '/admin', label: '대시보드', icon: LayoutDashboard },
    ],
  },
  {
    label: '콘텐츠',
    items: [
      { href: '/admin/stories', label: '책 이야기', icon: BookOpenText },
      { href: '/admin/sentences', label: '오늘의 문장', icon: Quote },
      { href: '/admin/banners', label: '메인 배너', icon: ImageIcon },
    ],
  },
  {
    label: '운영',
    items: [
      {
        href: '/admin/members',
        label: '회원 관리',
        icon: Users,
        badge: 'members',
      },
      {
        href: '/admin/books',
        label: '도서 검수',
        icon: BookCheck,
        badge: 'books',
      },
      { href: '/admin/reports', label: '신고', icon: Flag, badge: 'reports' },
    ],
  },
  {
    label: '점검',
    items: [
      { href: '/admin/quality', label: '품질', icon: Gauge },
      { href: '/admin/errors', label: '에러', icon: Bug },
      { href: '/admin/costs', label: 'AI 비용', icon: Receipt },
    ],
  },
];

// 서버 컴포넌트로 둔다. 현재 주소를 알아야 하는 링크 한 조각(AdminNavLink)만 클라이언트다.
type AdminNavProps = {
  /** 메뉴 옆 숫자. 레이아웃이 서버에서 읽어 넘긴다 */
  badges?: AdminNavBadges;
};

export const AdminNav = ({ badges = {} }: AdminNavProps) => {
  return (
    // 모바일은 가로로 스크롤되는 한 줄(묶음 사이는 세로 선), md 이상은 묶음 제목이 붙은 세로 목록
    <nav
      aria-label='운영 콘솔 메뉴'
      className='flex gap-1 overflow-x-auto p-2 md:flex-col md:gap-4 md:overflow-visible md:p-4'
    >
      {NAV_GROUPS.map((group, i) => (
        <div
          key={group.label}
          role='group'
          aria-labelledby={`admin-nav-${i}`}
          className='flex shrink-0 gap-1 border-line md:flex-col [&:not(:first-child)]:border-l [&:not(:first-child)]:pl-1 md:[&:not(:first-child)]:border-l-0 md:[&:not(:first-child)]:pl-0'
        >
          {/* 가로 한 줄에서는 제목이 자리만 차지해서 숨긴다(스크린 리더에는 남김) */}
          <span
            id={`admin-nav-${i}`}
            className='sr-only md:not-sr-only md:px-3 md:pb-1 md:text-xs md:text-text-subtle'
          >
            {group.label}
          </span>
          {group.items.map((item) => (
            <AdminNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              // 아이콘은 여기(서버)서 그려서 JSX 로 넘긴다 — 컴포넌트 함수는 클라이언트로 못 넘긴다
              icon={<item.icon className='h-4 w-4' aria-hidden />}
              count={item.badge ? badges[item.badge] : undefined}
            />
          ))}
        </div>
      ))}
    </nav>
  );
};
