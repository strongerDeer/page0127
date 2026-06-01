import {
  Bell,
  BookOpen,
  Home,
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
  { href: '/', label: '홈', icon: Home, primary: true },
  { href: '/dashboard', label: '내 서재', icon: BookOpen, primary: true },
  { href: '/feed', label: '피드', icon: Newspaper, primary: true },
  { href: '/books/add', label: '도서 추가', icon: PlusCircle },
  { href: '/search', label: '검색', icon: Search, primary: true },
  { href: '/notifications', label: '알림', icon: Bell, primary: true },
  { href: '/settings', label: '설정', icon: Settings, primary: true },
];

// 활성 메뉴 판정
// - '/'와 '/dashboard'는 하위 경로까지 활성 처리하면 안 되므로 정확히 일치만
//   ('/'는 startsWith가 모든 경로에 매칭되어 항상 활성으로 보이는 문제 방지)
// - 나머지는 하위 경로 포함 (예: /books/add/123)
export const isNavItemActive = (pathname: string, href: string): boolean => {
  if (href === '/' || href === '/dashboard') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};
