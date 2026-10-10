'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

// GNB 주 메뉴 — 활성 표시에 usePathname이 필요해서 이 부분만 Client
type GnbNavProps = {
  isLoggedIn: boolean;
};

type GnbLink = {
  href: string;
  label: string;
  /** true면 pathname이 정확히 일치할 때만 활성 (예: '/') */
  exact?: boolean;
};

export const GnbNav = ({ isLoggedIn }: GnbNavProps) => {
  const pathname = usePathname();

  const links: GnbLink[] = [
    { href: '/', label: '홈', exact: true },
    { href: '/books/all', label: '전체 도서' },
    // 소개는 로그인 여부와 상관없이 늘 같은(세 번째) 자리에 둔다 — 공통 메뉴 뒤에
    // 로그인 전용 메뉴가 붙는 구조라, 여기 두면 로그인해도 위치가 바뀌지 않는다.
    // 푸터에만 있을 땐 처음 온 사람이 "이게 뭐지?"를 풀 곳을 못 찾았다.
    { href: '/about', label: '소개' },
    // 피드·리더 찾기는 로그인해야 볼 수 있는 영역이라 비로그인 방문자에겐 노출하지 않는다.
    // '검색'이라 쓰지 않는 이유: 바로 옆 GnbSearch는 책을 찾는 입력창이라 헷갈린다.
    // '리더 찾기'인 이유: 이제 검색어 없이도 추천 리더를 둘러볼 수 있다(검색은 그중 하나).
    ...(isLoggedIn
      ? [
          { href: '/feed', label: '피드' },
          { href: '/search', label: '리더 찾기' },
        ]
      : []),
  ];

  return (
    // shrink-0 + whitespace-nowrap: 폭이 모자라면 메뉴가 아니라 검색창이 줄어든다.
    // 한글은 글자 사이 어디서든 줄이 바뀌어서, 눌리면 "전/체/도/서"처럼 세로로 쪼개진다
    // (768~1024px 에서 실제로 그랬다 — 메뉴가 넷으로 늘어난 2026-10-06 이후).
    <nav
      aria-label='주요 메뉴'
      className='hidden shrink-0 items-center gap-1 md:flex'
    >
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'text-text-strong'
                : 'text-text-subtle hover:text-text-strong'
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};
