'use client';

import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';
import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

// GNB 주 메뉴 — 활성 표시에 usePathname이 필요해서 이 부분만 Client
type GnbNavProps = {
  isLoggedIn: boolean;
  /** 로그인 사용자의 아이디 — '내 서재' 링크. 아직 없으면(드문 과도 상태) 메뉴에서 뺀다 */
  username: string | null;
};

type GnbLink = {
  href: string;
  label: string;
};

export const GnbNav = ({ isLoggedIn, username }: GnbNavProps) => {
  const pathname = usePathname();

  const myLibrary = isLoggedIn && username ? `/${username}` : null;

  const links: GnbLink[] = [
    // 내 서재 — 예전엔 프로필 드롭다운 안에만 있어 PC 에서 한 번 더 눌러야 했다(2026-11-24 HJ, A안)
    ...(myLibrary ? [{ href: myLibrary, label: '내 서재' }] : []),
    // '홈'은 두지 않는다 — 로고가 언제나 홈으로 간다(2026-10-25 HJ)
    // 소개는 홈에 합쳐졌다(2026-10-25). 남은 공지·업데이트 이력은 푸터에서만 닿는다.
    { href: '/books/all', label: '전체 도서' },
    // 책 이야기(독후감·인물관계도)는 2026-11-23 전까지 사이트맵에만 있고 사람이 닿을 링크가 없었다.
    { href: '/blog', label: '책 이야기' },
    // 라운지·리더 찾기는 로그인해야 볼 수 있는 영역이라 비로그인 방문자에겐 노출하지 않는다.
    // '검색'이라 쓰지 않는 이유: 바로 옆 GnbSearch는 책을 찾는 입력창이라 헷갈린다.
    // '리더 찾기'인 이유: 이제 검색어 없이도 추천 리더를 둘러볼 수 있다(검색은 그중 하나).
    ...(isLoggedIn
      ? [
          { href: '/feed', label: '라운지' },
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
        // 내 서재는 정확히 일치할 때만 — 하위(/{username}/{bookId})는 책 상세라 다르다(탭바와 같은 규칙)
        const active =
          link.href === myLibrary
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <IntentPrefetchLink
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
          </IntentPrefetchLink>
        );
      })}
    </nav>
  );
};
