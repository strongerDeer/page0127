'use client';

import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';
import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

import { NewsDot, useUnseenNews } from '@/widgets/news-notice';

// GNB 주 메뉴 — 활성 표시에 usePathname이 필요해서 이 부분만 Client
type GnbNavProps = {
  isLoggedIn: boolean;
  /** 로그인 사용자의 아이디 — '내 서재' 링크. 아직 없으면(드문 과도 상태) 메뉴에서 뺀다 */
  username: string | null;
};

type GnbLink = {
  href: string;
  label: string;
  /** 이 주소들에서도 이 칸을 켠다 — 라운지 안에서 들어가는 리더 찾기(/search) */
  alsoActiveOn?: string[];
};

const isUnder = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export const GnbNav = ({ isLoggedIn, username }: GnbNavProps) => {
  const pathname = usePathname();
  // 안 본 책 이야기 새 글이 있으면 그 칸에 빨간 점(2026-11-27 HJ A안)
  const { stories: unseenStories } = useUnseenNews();

  const myLibrary = isLoggedIn && username ? `/${username}` : null;

  // 메뉴 네 칸 — 폰 하단 탭(navItems)과 같은 칸이다(2026-11-26 HJ, "모바일이랑 통일성").
  // - 리더 찾기는 라운지 안으로 옮겼다(라운지 머리의 버튼). /search 에선 라운지 칸이 켜진다.
  // - 문장 서랍·주간 회상·배지·AI 취향 분석은 서재 안 내용이라 프로필 메뉴에서 닿는다.
  // - 하루 한 번(오늘의 문장·필사)과 소개·공지·문의는 ☰ 목차에 있다.
  // '홈'은 두지 않는다 — 로고가 언제나 홈으로 간다(2026-10-25 HJ)
  const links: GnbLink[] = [
    ...(myLibrary ? [{ href: myLibrary, label: '내 서재' }] : []),
    // 라운지는 로그인해야 볼 수 있는 영역이라 비로그인 방문자에겐 노출하지 않는다.
    ...(isLoggedIn
      ? [{ href: '/feed', label: '라운지', alsoActiveOn: ['/search'] }]
      : []),
    { href: '/books/all', label: '전체 도서' },
    { href: '/blog', label: '책 이야기' },
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
        // 내 서재는 정확히 일치할 때만 — 하위(/{username}/{bookId})는 책 상세라 다르다(탭바와 같은 규칙)
        const active =
          link.href === myLibrary
            ? pathname === link.href
            : isUnder(pathname, link.href) ||
              (link.alsoActiveOn ?? []).some((base) => isUnder(pathname, base));
        return (
          <IntentPrefetchLink
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'text-text-strong'
                : 'text-text-subtle hover:text-text-strong'
            )}
          >
            {link.label}
            {link.href === '/blog' && unseenStories > 0 && (
              <NewsDot label='새 글' className='right-1 top-1.5' />
            )}
          </IntentPrefetchLink>
        );
      })}
    </nav>
  );
};
