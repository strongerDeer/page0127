import {
  BookOpen,
  BookText,
  LibraryBig,
  PlusCircle,
  UsersRound,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

// 모바일 하단 탭바 메뉴 단일 소스 (데스크톱 메뉴는 Gnb의 GnbNav가 담당)
// 실제 라우팅 기준: /books·taste-analysis는 redirect 대상이라 메뉴에서 제외
//
// PC 상단 글자 메뉴와 같은 네 칸이다(2026-11-26 HJ): 기기를 바꿔도 같은 곳이 같은 자리에 있게.
// - 리더 찾기는 라운지 안으로 옮겼다(라운지 머리의 '리더 찾기' 버튼). /search 에선 라운지 칸이 켜진다.
// - 알림은 머리글 종(🔔)으로 돌아갔다 — PC 와 같은 자리.
// - 하루 한 번(오늘의 문장·온라인 필사)·설정·소개·공지·문의는 ☰ 목차(TocMenu)에 있다.
export type NavItem = {
  label: string;
  icon: LucideIcon;
  primary?: boolean;
  /** '내 서재' 전용 — true면 href 대신 로그인 사용자의 /{username}으로 연결한다 */
  isMyLibrary?: boolean;
  href?: string;
  /** 이 주소들에서도 이 칸을 켠다 — 라운지 안에서 들어가는 리더 찾기(/search) */
  alsoActiveOn?: string[];
};

export const navItems: NavItem[] = [
  { label: '내 서재', icon: BookOpen, primary: true, isMyLibrary: true },
  {
    href: '/feed',
    label: '라운지',
    icon: UsersRound,
    primary: true,
    alsoActiveOn: ['/search'],
  },
  { href: '/books/all', label: '전체 도서', icon: LibraryBig, primary: true },
  { href: '/blog', label: '책 이야기', icon: BookText, primary: true },
  { href: '/books/add', label: '도서 추가', icon: PlusCircle },
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
  const matches = (base: string) =>
    pathname === base || pathname.startsWith(`${base}/`);
  return matches(href) || (item.alsoActiveOn ?? []).some(matches);
};
