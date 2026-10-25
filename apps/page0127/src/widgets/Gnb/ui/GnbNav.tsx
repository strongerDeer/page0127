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
    // 홈은 비로그인 랜딩 전용이다 — 로그인한 사람이 / 로 오면 내 서재로 보낸다.
    // 그래서 로그인 메뉴에 '홈'을 두면 '내 서재'와 같은 곳을 가리키는 메뉴가 된다.
    ...(isLoggedIn ? [] : [{ href: '/', label: '홈', exact: true }]),
    // 소개는 홈에 합쳐졌다(2026-10-25). 남은 공지·업데이트 이력은 푸터에서만 닿는다.
    { href: '/books/all', label: '전체 도서' },
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
