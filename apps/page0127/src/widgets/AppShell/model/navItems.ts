import {
  BarChart3,
  Bell,
  Home,
  Library,
  Newspaper,
  Search,
  Settings,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

// 메뉴 단일 소스 — 사이드바와 하단 탭바가 공유
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // 모바일 하단 탭바에 노출할 핵심 항목 여부
  primary?: boolean;
};

export const navItems: NavItem[] = [
  { href: '/dashboard', label: '홈', icon: Home, primary: true },
  { href: '/feed', label: '피드', icon: Newspaper, primary: true },
  { href: '/books', label: '서재', icon: Library, primary: true },
  { href: '/dashboard/taste-analysis', label: '통계', icon: BarChart3 },
  { href: '/search', label: '검색', icon: Search, primary: true },
  { href: '/notifications', label: '알림', icon: Bell },
  { href: '/settings', label: '설정', icon: Settings, primary: true },
];

// 활성 메뉴 판정 — '/dashboard'는 정확히 일치, 나머지는 하위 경로 포함
export const isNavItemActive = (pathname: string, href: string): boolean => {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};
