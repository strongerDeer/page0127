'use client';

import { useState } from 'react';

import { usePathname } from 'next/navigation';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui';
import {
  Award,
  BookOpen,
  BookText,
  CalendarDays,
  Carrot,
  Info,
  Keyboard,
  LibraryBig,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Quote,
  Settings,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

import { nameInitials } from '@/entities/profile/model/displayName';

import { useLogout } from '@/features/auth/api/useLogout';

import { NewsDot, useUnseenNews } from '@/widgets/news-notice';

import { getTocGroups, isTocLinkActive } from '../model/tocLinks';

import type { TocIcon, TocLink } from '../model/tocLinks';
import type { LucideIcon } from 'lucide-react';

// PC 프로필 메뉴(ProfileDropdown)와 같은 그림을 쓴다 — 같은 곳은 같은 아이콘
const TOC_ICONS: Record<TocIcon, LucideIcon> = {
  library: BookOpen,
  quotes: Quote,
  recap: CalendarDays,
  badges: Award,
  taste: Sparkles,
  settings: Settings,
  lounge: UsersRound,
  allBooks: LibraryBig,
  stories: BookText,
  sentence: Carrot,
  typing: Keyboard,
  about: Info,
  updates: Megaphone,
  contact: Mail,
};

/**
 * "목차" 메뉴 — 상단 바 오른쪽 끝 ☰ 를 누르면 오른쪽에서 열리는 시트.
 *
 * 처음엔 폰 전용이었다(데스크톱 주 메뉴가 768px 아래에서 숨어서, 2026-11-23 HJ).
 * 2026-11-26 부터 PC 에도 보인다 — 메뉴 칸을 네 개로 줄이면서 하루 한 번(오늘의 문장·필사)과
 * 소개·공지·문의를 PC·폰 모두 여기서 닿게 했다(기기를 바꿔도 같은 자리).
 * PC 에선 내 이름·내 서재 묶음·로그아웃은 숨긴다 — 프로필 메뉴(ProfileDropdown)가 같은 일을 한다.
 *
 * 왜 @repo/ui 의 DialogContent 가 아니라 Radix 원본인가:
 * DialogContent 는 "가운데 뜨는 모달" 모양(가운데 정렬·확대 애니메이션)이 박혀 있다.
 * className 으로 덮으면 twMerge 가 모르는 애니메이션 클래스(zoom-in-95)가 남아
 * 옆에서 밀려 들어오는 시트와 섞인다. 접근성(포커스 가두기·Esc·스크롤 잠금·aria-modal)은
 * Radix 원본이 그대로 주므로, 모양만 여기서 새로 입힌다.
 */
type TocUser = {
  photoUrl: string | null;
  displayName: string;
  username: string | null;
};

type TocMenuProps = {
  /** null 이면 비로그인 방문자 */
  user: TocUser | null;
  /**
   * 상단 메뉴·하단 탭·프로필 메뉴가 없는 단독 페이지(StandaloneShell)에서 true.
   * 목차가 유일한 길이라 메뉴 네 칸과 내 공간·로그아웃을 PC 에서도 보여 준다(2026-11-27 HJ A안).
   */
  standalone?: boolean;
};

/**
 * 모바일에선 상단 바의 프로필 아바타(ProfileDropdown)를 숨기고, 그 역할을 목차 맨 위가 맡는다
 * (2026-11-24 HJ, C안). 320px 폰에서 상단 바가 40px 넘쳐 페이지가 좌우로 흔들렸기 때문이다.
 * 드롭다운에 있던 것(이름·설정·로그아웃)이 여기 있어야 잃는 기능이 없다. 내 서재는 하단 탭바 첫 칸이다.
 */
const LinkIcon = ({ link, size }: { link: TocLink; size: 'main' | 'sub' }) => {
  if (!link.icon) return null;
  const Icon = TOC_ICONS[link.icon];
  return (
    <Icon
      aria-hidden='true'
      className={cn(
        'mr-3 shrink-0 text-text-subtle',
        size === 'main' ? 'size-5' : 'size-4'
      )}
    />
  );
};

export const TocMenu = ({ user, standalone = false }: TocMenuProps) => {
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

  // 새 소식(2026-11-27 HJ A안) — 공지는 ☰ 안에만 있으니 ☰ 에 점을 찍는다.
  // 책 이야기는 메뉴 칸(PC 상단·폰 하단 탭)에 점이 찍히고, 하단 탭이 없는 비로그인 폰만 ☰ 안에 있다.
  const { updates: unseenUpdates, stories: unseenStories } = useUnseenNews();
  const showTriggerDot =
    unseenUpdates > 0 || (!isLoggedIn && unseenStories > 0);
  // 줄 오른쪽 작은 글자 — "새 소식 2"
  const newsCountFor = (href: string) => {
    if (href === '/updates' && unseenUpdates > 0)
      return `새 소식 ${unseenUpdates}`;
    if (href === '/blog' && unseenStories > 0) return `새 글 ${unseenStories}`;
    return null;
  };
  const renderNewsCount = (href: string) => {
    const text = newsCountFor(href);
    return text ? (
      <span className='ml-auto pl-3 text-xs font-semibold text-destructive'>
        {text}
      </span>
    ) : null;
  };

  const { account, main, daily, sub } = getTocGroups({
    isLoggedIn,
    username,
    standalone,
  });
  // 보통 화면의 PC 는 상단 메뉴·프로필 메뉴가 같은 일을 해서 숨긴다. 단독 페이지엔 그게 없다.
  const pcHidden = standalone ? '' : 'md:hidden';

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
            <LinkIcon link={link} size={size} />
            {link.label}
            {renderNewsCount(link.href)}
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
            <LinkIcon link={link} size={size} />
            {link.label}
            {renderNewsCount(link.href)}
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
          className='relative flex size-9 items-center justify-center rounded-full text-text-subtle transition-colors hover:bg-sunken hover:text-text-strong'
        >
          <Menu aria-hidden='true' className='size-5' />
          {showTriggerDot && <NewsDot className='right-1 top-1' />}
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className='fixed inset-0 z-50 bg-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0' />
        <DialogPrimitive.Content
          // 설명 문단이 없는 시트 — 없다고 명시해야 Radix 가 콘솔 경고를 내지 않는다
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-[min(20rem,85vw)] flex-col border-l border-line bg-card',
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
              // PC 에선 프로필 메뉴가 같은 목록을 보여 준다 → 폰에서만
              <div className={cn('border-b border-line pb-4', pcHidden)}>
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
            {/* 메뉴 칸으로 가는 길 — 보통은 비로그인 폰만(PC 는 상단 메뉴에 같은 칸), 단독 페이지는 PC·폰 모두 */}
            {main.length > 0 && (
              <ul className={cn('border-b border-line pb-4', pcHidden)}>
                {main.map((link) => renderLink(link, 'main'))}
              </ul>
            )}
            {/* 하루 한 번 하는 놀이 묶음 — 이름표로 묶음임을 알린다(2026-11-26 HJ C안) */}
            <div>
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
                className={cn(
                  'mt-auto flex h-10 items-center gap-2 rounded-md px-3 text-sm text-destructive transition-colors hover:bg-sunken',
                  pcHidden
                )}
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
