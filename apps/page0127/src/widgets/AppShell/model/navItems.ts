import { Bell, BookOpen, Newspaper, PlusCircle, Search } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

// 모바일 하단 탭바 메뉴 단일 소스 (데스크톱 메뉴는 Gnb의 GnbNav가 담당)
// 실제 라우팅 기준: /books·taste-analysis는 redirect 대상이라 메뉴에서 제외
export type NavItem = {
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  /** '내 서재' 전용 — true면 href 대신 로그인 사용자의 /{username}으로 연결한다 */
  isMyLibrary?: boolean;
  href?: string;
};

export const navItems: NavItem[] = [
  { label: '내 서재', icon: BookOpen, primary: true, isMyLibrary: true },
  { href: '/feed', label: '피드', icon: Newspaper, primary: true },
  { href: '/books/add', label: '도서 추가', icon: PlusCircle },
  { href: '/search', label: '검색', icon: Search, primary: true },
  { href: '/notifications', label: '알림', icon: Bell, primary: true },
];

/** '내 서재'는 username이 없으면(드문 과도 상태) 링크를 만들 수 없다 — 홈으로 폴백 */
export const resolveNavHref = (
  item: NavItem,
  username: string | null
): string => {
  if (item.isMyLibrary) {
    return username ? `/${username}` : '/';
  }
  return item.href!;
};

// 활성 메뉴 판정
// - '내 서재'는 하위 경로(/{username}/{bookId} 등)까지 활성 처리하면
//   안 되므로 정확히 일치할 때만 활성으로 본다 (예전 '/dashboard' 특례와 동일한 규칙)
export const isNavItemActive = (
  pathname: string,
  item: NavItem,
  username: string | null
): boolean => {
  const href = resolveNavHref(item, username);
  if (item.isMyLibrary) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};
