/**
 * ☰ "목차" 메뉴의 항목 — 순수 함수로 떼어 두어 테스트하기 쉽게 한다.
 *
 * 역할 분담 (2026-11-26 HJ, PC = 폰):
 * - 메뉴 네 칸(PC 상단 글자·폰 하단 탭): 내 서재·라운지·전체 도서·책 이야기
 * - 내 서재에 딸린 곳(문장 서랍·주간 회상·배지·AI 취향 분석·설정): PC 프로필 메뉴 / 폰 목차 맨 위
 * - 목차: 하루 한 번(오늘의 문장·온라인 필사)과 잘 안 가는 곳(소개·공지·문의). PC 에도 ☰ 가 있다.
 *
 * 메뉴 칸에 이미 있는 곳은 목차에 다시 넣지 않는다(같은 메뉴 두 벌 X).
 * 단 비로그인 폰은 하단 탭이 없어서 전체 도서·책 이야기를 목차에 둔다(main).
 */
import { getMyLibraryLinks } from '@/entities/profile/model/myLibraryLinks';

import type { MyLibraryLinkKey } from '@/entities/profile/model/myLibraryLinks';

/** 목차 줄 앞 아이콘 — 그림은 TocMenu 가 고른다(모델엔 React 를 두지 않는다) */
export type TocIcon =
  | MyLibraryLinkKey
  | 'settings'
  | 'lounge'
  | 'allBooks'
  | 'stories'
  | 'sentence'
  | 'typing'
  | 'about'
  | 'updates'
  | 'contact';

export type TocLink = {
  href: string;
  label: string;
  /** 줄 앞 아이콘(2026-11-26 HJ: 폰에도 PC 프로필 메뉴처럼 아이콘) */
  icon?: TocIcon;
  /**
   * true 면 Next Link 대신 일반 a 로 페이지를 새로 불러온다.
   * /sentence 는 서재 배너용 가로채기 라우트(@modal/(.)sentence)가 Link 이동을 모달로 바꾸는데,
   * 메뉴는 "그곳으로 가기"라 페이지로 보낸다(2026-11-26 HJ A안). 가로채기는 소프트 내비게이션에서만 일어난다.
   */
  fullPageLoad?: boolean;
};

export type TocGroups = {
  /** 로그인했을 때만 — 내 서재에 딸린 곳(폰 목차 맨 위, PC 는 프로필 메뉴가 같은 일을 한다) */
  account: TocLink[];
  /**
   * 메뉴 칸이 없는 곳에서 둘러볼 곳으로 가는 길
   * - 보통 화면: 비로그인 폰만(하단 탭이 없어서) 전체 도서·책 이야기
   * - 단독 페이지(standalone): PC·폰 모두 메뉴 네 칸(비로그인은 전체 도서·책 이야기)
   */
  main: TocLink[];
  /** 누구에게나 — 하루 한 번 하는 놀이(오늘의 문장·온라인 필사) */
  daily: TocLink[];
  /** 작게 — 자주 안 가지만 찾을 수 있어야 하는 곳 */
  sub: TocLink[];
};

type GetTocGroupsParams = {
  isLoggedIn: boolean;
  /** 로그인한 사람의 아이디 — 문장 서랍(/{username}/quotes) 같은 주소에 쓴다 */
  username?: string | null;
  /**
   * 상단 메뉴·하단 탭이 없는 단독 페이지(/sentence·/typing — StandaloneShell)인가.
   * 이 목차는 "메뉴 칸이 바깥에 있다"는 전제로 네 칸을 빼 두는데, 단독 페이지엔 그 바깥이 없다
   * → 목차가 유일한 길이라 네 칸을 넣는다(2026-11-27 HJ A안).
   */
  standalone?: boolean;
};

/** 메뉴 네 칸(navItems 와 같은 순서) — 단독 페이지 목차 맨 위에 쓴다 */
const getMenuLinks = (
  isLoggedIn: boolean,
  username: string | null
): TocLink[] => {
  const browse: TocLink[] = [
    { href: '/books/all', label: '전체 도서', icon: 'allBooks' },
    { href: '/blog', label: '책 이야기', icon: 'stories' },
  ];
  if (!isLoggedIn) return browse;
  return [
    // 아이디를 아직 모르면(가입 직후) 내 서재 주소를 만들 수 없다 → 뺀다
    ...(username
      ? [{ href: `/${username}`, label: '내 서재', icon: 'library' as const }]
      : []),
    { href: '/feed', label: '라운지', icon: 'lounge' },
    ...browse,
  ];
};

export const getTocGroups = ({
  isLoggedIn,
  username = null,
  standalone = false,
}: GetTocGroupsParams): TocGroups => ({
  // 내 서재는 폰 하단 탭 첫 칸이라 빼고, 나머지는 PC 프로필 메뉴와 같은 목록
  account: isLoggedIn
    ? [
        ...getMyLibraryLinks(username)
          .filter((link) => link.key !== 'library')
          .map(({ key, href, label }) => ({ href, label, icon: key })),
        { href: '/settings', label: '설정', icon: 'settings' },
      ]
    : [],
  main: standalone
    ? getMenuLinks(isLoggedIn, username)
    : isLoggedIn
      ? []
      : getMenuLinks(false, username),
  daily: [
    {
      href: '/sentence',
      label: '오늘의 문장 뽑기',
      icon: 'sentence',
      fullPageLoad: true,
    },
    {
      href: '/typing/little-prince',
      label: '어린 왕자 온라인 필사',
      icon: 'typing',
    },
  ],
  // 서비스 소개·공지·문의는 "잘 안 보여도 되는 곳"(2026-11-26 HJ) — 작은 글씨로 맨 아래
  sub: [
    { href: '/about', label: '서비스 소개', icon: 'about' },
    { href: '/updates', label: '공지·업데이트', icon: 'updates' },
    { href: '/contact', label: '문의', icon: 'contact' },
  ],
});

/**
 * 지금 페이지인가.
 * - /books/all, /blog 처럼 아래에 상세가 있는 곳은 하위 경로(/blog/글)도 같은 칸으로 본다.
 * - 내 서재(/{username})는 정확히 일치할 때만 — 하위(/{username}/{bookId})는 책 상세라 다르다.
 *   하단 탭바(navItems.isNavItemActive)와 같은 규칙이다.
 */
export const isTocLinkActive = (
  pathname: string,
  link: TocLink,
  username: string | null
): boolean => {
  if (username && link.href === `/${username}`) {
    return pathname === link.href;
  }
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
};
