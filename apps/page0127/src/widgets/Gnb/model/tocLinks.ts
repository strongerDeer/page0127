/**
 * 모바일 "목차" 메뉴의 항목 — 순수 함수로 떼어 두어 테스트하기 쉽게 한다.
 *
 * 역할 분담 (2026-11-23 HJ, A안):
 * - 하단 탭바(BottomTabBar): 로그인한 사람이 매일 쓰는 곳(내 서재·라운지·리더 찾기·알림)
 * - 목차: 그 밖의 모든 곳. 모바일에선 GnbNav 가 숨겨져서 여기가 아니면 푸터까지 내려야 했다.
 *
 * 내 서재·라운지·리더 찾기·알림은 탭바에 이미 있으니 목차에 다시 넣지 않는다(같은 메뉴 두 벌 X).
 */
export type TocLink = {
  href: string;
  label: string;
};

export type TocGroups = {
  /** 로그인했을 때만 — 내 공간 */
  account: TocLink[];
  /** 누구에게나 — 둘러볼 곳 */
  main: TocLink[];
  /** 누구에게나 — 하루 한 번 하는 놀이(오늘의 문장·온라인 필사, 2026-11-26 HJ C안) */
  daily: TocLink[];
  /** 작게 — 자주 안 가지만 찾을 수 있어야 하는 곳 */
  sub: TocLink[];
};

type GetTocGroupsParams = {
  isLoggedIn: boolean;
};

export const getTocGroups = ({
  isLoggedIn,
}: GetTocGroupsParams): TocGroups => ({
  // 내 서재는 하단 탭바 첫 칸에 있어 목차엔 두지 않는다(2026-11-24 HJ, 메뉴 겹침 정리 A안)
  account: isLoggedIn ? [{ href: '/settings', label: '설정' }] : [],
  main: [
    { href: '/books/all', label: '전체 도서' },
    { href: '/blog', label: '책 이야기' },
    { href: '/about', label: '서비스 소개' },
  ],
  // PC 상단 메뉴엔 넣지 않는다 — 로그인하면 7칸이 돼 768~1024px 에서 검색창이 너무 줄어든다.
  // PC 는 홈 당근·서재 배너·푸터로 들어간다. 목차에서 /sentence 를 누르면 서재 배너처럼 모달로 뜬다.
  daily: [
    { href: '/sentence', label: '오늘의 문장 뽑기' },
    { href: '/typing/little-prince', label: '어린 왕자 온라인 필사' },
  ],
  sub: [
    { href: '/updates', label: '공지·업데이트' },
    { href: '/contact', label: '문의' },
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
