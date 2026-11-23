'use client';

import { useState } from 'react';

import { usePathname } from 'next/navigation';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

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
type MobileTocMenuProps = {
  isLoggedIn: boolean;
  username: string | null;
};

export const MobileTocMenu = ({ isLoggedIn, username }: MobileTocMenuProps) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 페이지가 바뀌면 닫는다 — 뒤로 가기처럼 메뉴 링크를 거치지 않은 이동도 포함.
  // useEffect 로 닫으면 새 페이지가 한 번 "열린 채로" 그려진 뒤 닫힌다.
  // 렌더 중에 이전 값과 비교해 바로 고치면 그 깜빡임이 없다(React 공식 문서의
  // "props 가 바뀔 때 state 조정하기" 패턴).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const { account, main, sub } = getTocGroups({ isLoggedIn, username });

  const renderLink = (link: TocLink, size: 'main' | 'sub') => {
    const active = isTocLinkActive(pathname, link, username);
    return (
      <li key={link.href}>
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
            {account.length > 0 && (
              <ul className='border-b border-line pb-4'>
                {account.map((link) => renderLink(link, 'main'))}
              </ul>
            )}
            <ul>{main.map((link) => renderLink(link, 'main'))}</ul>
            <ul className='border-t border-line pt-4'>
              {sub.map((link) => renderLink(link, 'sub'))}
            </ul>
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
