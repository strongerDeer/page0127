'use client';

import { useState } from 'react';

import { usePathname } from 'next/navigation';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui';
import { LogOut, Menu, X } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

import { nameInitials } from '@/entities/profile/model/displayName';

import { useLogout } from '@/features/auth/api/useLogout';

import { getTocGroups, isTocLinkActive } from '../model/tocLinks';

import type { TocLink } from '../model/tocLinks';

/**
 * 모바일 "목차" 메뉴 — 상단 바 오른쪽 끝 ☰ 를 누르면 오른쪽에서 열리는 시트.
 *
 * 왜 필요한가: 데스크톱 주 메뉴(GnbNav)는 768px 아래에서 숨겨진다. 그래서 모바일에선
 * 전체 도서·책 이야기·소개에 가려면 푸터까지 내려야 했다(2026-11-23 HJ).
 *
 * 왜 @repo/ui 의 DialogContent 가 아니라 Radix 원본인가:
 * DialogContent 는 "가운데 뜨는 모달" 모양(가운데 정렬·확대 애니메이션)이 박혀 있다.
 * className 으로 덮으면 twMerge 가 모르는 애니메이션 클래스(zoom-in-95)가 남아
 * 옆에서 밀려 들어오는 시트와 섞인다. 접근성(포커스 가두기·Esc·스크롤 잠금·aria-modal)은
 * Radix 원본이 그대로 주므로, 모양만 여기서 새로 입힌다.
 */
type MobileTocUser = {
  photoUrl: string | null;
  displayName: string;
  username: string | null;
};

type MobileTocMenuProps = {
  /** null 이면 비로그인 방문자 */
  user: MobileTocUser | null;
};

/**
 * 모바일에선 상단 바의 프로필 아바타(ProfileDropdown)를 숨기고, 그 역할을 목차 맨 위가 맡는다
 * (2026-11-24 HJ, C안). 320px 폰에서 상단 바가 40px 넘쳐 페이지가 좌우로 흔들렸기 때문이다.
 * 드롭다운에 있던 것(이름·설정·로그아웃)이 여기 있어야 잃는 기능이 없다. 내 서재는 하단 탭바 첫 칸이다.
 */
export const MobileTocMenu = ({ user }: MobileTocMenuProps) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { logout } = useLogout();
  const isLoggedIn = !!user;
  const username = user?.username ?? null;

  // 페이지가 바뀌면 닫는다 — 뒤로 가기처럼 메뉴 링크를 거치지 않은 이동도 포함.
  // useEffect 로 닫으면 새 페이지가 한 번 "열린 채로" 그려진 뒤 닫힌다.
  // 렌더 중에 이전 값과 비교해 바로 고치면 그 깜빡임이 없다(React 공식 문서의
  // "props 가 바뀔 때 state 조정하기" 패턴).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const { account, main, daily, sub } = getTocGroups({ isLoggedIn });

  const renderLink = (link: TocLink, size: 'main' | 'sub') => {
    const active = isTocLinkActive(pathname, link, username);
    return (
      <li key={link.href}>
        {link.fullPageLoad ? (
          // 가로채기 라우트를 피해 페이지로 — 일반 a 는 전체 페이지를 새로 불러온다(tocLinks 의 fullPageLoad 참고)
          <a
            href={link.href}
            aria-current={active ? 'page' : undefined}
            onClick={() => setOpen(false)}
          className={cn(
            'relative flex items-center rounded-md px-3 transition-colors hover:bg-sunken',
            size === 'main'
              ? 'h-12 text-base text-text-strong'
              : 'h-10 text-sm text-text-subtle hover:text-text-strong',
            active && 'font-semibold text-text-strong'
          )}
        
          >
          {/* 지금 페이지 표시 — 민트는 면이 아니라 점으로만 쓴다(브랜드 규칙) */}
          {active && (
            <span
              aria-hidden='true'
              className='absolute left-0 size-1.5 rounded-full bg-mint'
            />
          )}
          {link.label}
          </a>
        ) : (
        <IntentPrefetchLink
          href={link.href}
          aria-current={active ? 'page' : undefined}
          // 지금 페이지를 다시 누르면 주소가 안 바뀌어 위의 자동 닫기가 안 돈다 → 직접 닫는다
          onClick={() => setOpen(false)}
          className={cn(
            'relative flex items-center rounded-md px-3 transition-colors hover:bg-sunken',
            size === 'main'
              ? 'h-12 text-base text-text-strong'
              : 'h-10 text-sm text-text-subtle hover:text-text-strong',
            active && 'font-semibold text-text-strong'
          )}
        >
          {/* 지금 페이지 표시 — 민트는 면이 아니라 점으로만 쓴다(브랜드 규칙) */}
          {active && (
            <span
              aria-hidden='true'
              className='absolute left-0 size-1.5 rounded-full bg-mint'
            />
          )}
          {link.label}
        </IntentPrefetchLink>
        )}
      </li>
    );
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type='button'
          aria-label='메뉴 열기'
          className='flex size-9 items-center justify-center rounded-full text-text-subtle transition-colors hover:bg-sunken hover:text-text-strong md:hidden'
        >
          <Menu aria-hidden='true' className='size-5' />
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className='fixed inset-0 z-50 bg-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 md:hidden' />
        <DialogPrimitive.Content
          // 설명 문단이 없는 시트 — 없다고 명시해야 Radix 가 콘솔 경고를 내지 않는다
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-[min(20rem,85vw)] flex-col border-l border-line bg-card md:hidden',
            // 아이폰 홈 바·노치에 가리지 않게
            'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]',
            'duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right motion-reduce:animate-none'
          )}
        >
          {/* 상단 바와 같은 높이(h-16)로 맞춰 열려도 머리 줄이 흔들리지 않게 */}
          <div className='flex h-16 shrink-0 items-center justify-between px-6'>
            <DialogPrimitive.Title className='text-lg font-bold text-text-strong'>
              목차
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label='메뉴 닫기'
              className='-mr-2 flex size-9 items-center justify-center rounded-full text-text-subtle transition-colors hover:bg-sunken hover:text-text-strong'
            >
              <X aria-hidden='true' className='size-5' />
            </DialogPrimitive.Close>
          </div>

          <nav
            aria-label='전체 메뉴'
            className='flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-6'
          >
            {user && (
              <div className='border-b border-line pb-4'>
                {/* 누구로 로그인했는지 — 데스크톱 드롭다운의 이름 줄과 같은 역할 */}
                <div className='mb-2 flex items-center gap-3 px-3'>
                  <Avatar className='size-9'>
                    <AvatarImage src={user.photoUrl || undefined} alt='' />
                    <AvatarFallback>
                      {nameInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className='min-w-0 truncate text-sm font-semibold text-text-strong'>
                    {user.displayName}
                  </span>
                </div>
                <ul>{account.map((link) => renderLink(link, 'main'))}</ul>
              </div>
            )}
            <ul>{main.map((link) => renderLink(link, 'main'))}</ul>
            {/* 하루 한 번 하는 놀이 묶음 — 이름표로 묶음임을 알린다(2026-11-26 HJ C안) */}
            <div className='border-t border-line pt-4'>
              <p
                id='toc-daily'
                className='mb-1 px-3 text-xs font-semibold text-text-subtle'
              >
                하루 한 번
              </p>
              <ul aria-labelledby='toc-daily'>
                {daily.map((link) => renderLink(link, 'main'))}
              </ul>
            </div>
            <ul className='border-t border-line pt-4'>
              {sub.map((link) => renderLink(link, 'sub'))}
            </ul>
            {user && (
              <button
                type='button'
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className='mt-auto flex h-10 items-center gap-2 rounded-md px-3 text-sm text-destructive transition-colors hover:bg-sunken'
              >
                <LogOut aria-hidden='true' className='size-4' />
                로그아웃
              </button>
            )}
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
