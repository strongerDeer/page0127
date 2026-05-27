import {
  Bell,
  BookOpen,
  Newspaper,
  PlusCircle,
  Search,
  Settings,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

// 메뉴 단일 소스 — 사이드바와 하단 탭바가 공유
// 실제 라우팅 기준: /books·taste-analysis는 redirect 대상이라 메뉴에서 제외
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // 모바일 하단 탭바에 노출할 핵심 항목 여부
  primary?: boolean;
};

export const navItems: NavItem[] = [
  { href: '/dashboard', label: '내 서재', icon: BookOpen, primary: true },
  { href: '/feed', label: '피드', icon: Newspaper, primary: true },
  { href: '/books/add', label: '도서 추가', icon: PlusCircle, primary: true },
  { href: '/search', label: '검색', icon: Search, primary: true },
  { href: '/notifications', label: '알림', icon: Bell, primary: true },
  { href: '/settings', label: '설정', icon: Settings },
];

// 활성 메뉴 판정 — '/dashboard'는 정확히 일치, 나머지는 하위 경로 포함
export const isNavItemActive = (pathname: string, href: string): boolean => {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};
