import Image from 'next/image';
import Link from 'next/link';

import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { cn } from '@/shared/lib/utils';

import { getShellUser, SiteFooter } from '@/widgets/AppShell';
import { TocMenu } from '@/widgets/Gnb';

/**
 * 단독 랜딩 셸 — /sentence(오늘의 문장)·/typing/little-prince(온라인 필사) 공용
 *
 * 두 페이지는 "이 서비스만 써도 되는 랜딩"이라 사이트 GNB·하단 탭바 대신 전용 머리글만 둔다(HJ 11/24).
 * 그런데 그러면 돌아갈 길이 로고·내 서재 버튼뿐이고, 문의·약관 링크도 빠진다.
 * → 머리글은 그대로 두고 모바일 ☰ 목차와 사이트 푸터만 붙인다(HJ 11/26 A안).
 *
 * 사용자 정보는 레이아웃과 같은 getCurrentUser·getProfile(React cache)을 쓴다 —
 * 페이지가 이미 같은 요청에서 부르고 있어서 DB 를 한 번 더 읽지 않는다.
 */
type StandaloneShellProps = {
  /** 머리글 "page0127. | ○○" 의 오른쪽 이름 */
  title: string;
  /** 비로그인일 때 로그인 버튼이 갈 곳(로그인 뒤 이 페이지로 돌아오게 next 를 붙여서) */
  loginHref: string;
  /** 비로그인 로그인 버튼을 파란 버튼으로 강조할지(필사는 진행도 저장 때문에 강조) */
  emphasizeLogin?: boolean;
  /** 본문 칸 배경(예: 오늘의 문장의 하늘색 책상) — 머리글·푸터는 늘 카드색 */
  bodyClassName?: string;
  children: React.ReactNode;
};

export const StandaloneShell = async ({
  title,
  loginHref,
  emphasizeLogin = false,
  bodyClassName,
  children,
}: StandaloneShellProps) => {
  const user = await getCurrentUser();
  const shellUser = user ? await getShellUser(user) : null;
  const libraryHref = shellUser?.username ? `/${shellUser.username}` : '/';

  return (
    <div className='flex min-h-svh flex-col'>
      {/* 높이 59px 고정 — 오늘의 문장 책상이 calc(100svh - 59px) 로 화면을 채운다(SentenceBook.module.css).
          ☰(36px)가 붙어도 머리글이 커지지 않게 py 대신 높이로 정한다 */}
      <header className='relative z-10 flex h-[59px] shrink-0 items-center justify-between gap-3 border-b border-line-soft bg-card px-4 sm:px-6'>
        <Link
          href='/'
          className='flex min-w-0 items-center gap-2.5 text-text-strong'
          aria-label='page0127 홈으로'
        >
          <Image
            src='/brand/app-icon-96.webp'
            alt=''
            width={28}
            height={28}
            unoptimized
            className='size-7'
          />
          <span className='text-lg font-bold text-primary'>page0127.</span>
          <span aria-hidden className='h-4 w-px bg-line-soft' />
          <span className='truncate text-base font-bold'>{title}</span>
        </Link>
        <div className='flex shrink-0 items-center gap-1'>
          <Link
            href={shellUser ? libraryHref : loginHref}
            className={
              !shellUser && emphasizeLogin
                ? 'rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90'
                : 'rounded-lg px-2.5 py-1.5 text-sm text-text-subtle hover:bg-accent hover:text-text-strong'
            }
          >
            {shellUser ? '내 서재' : '로그인'}
          </Link>
          {/* 사이트 다른 화면과 같은 목차(PC·폰 모두) */}
          <TocMenu
            user={
              shellUser
                ? {
                    photoUrl: shellUser.photoUrl,
                    displayName: shellUser.displayName,
                    username: shellUser.username,
                  }
                : null
            }
          />
        </div>
      </header>
      <div className={cn('flex-1', bodyClassName)}>{children}</div>
      <SiteFooter />
    </div>
  );
};
