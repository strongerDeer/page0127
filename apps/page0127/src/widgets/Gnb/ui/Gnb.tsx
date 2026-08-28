import Link from 'next/link';

import { Button } from '@repo/ui';
import { Plus, Search } from 'lucide-react';

import { NotificationDropdown } from '@/features/notification';
import { ProfileDropdown } from '@/features/profile';

import { GnbNav } from './GnbNav';
import { GnbSearch } from './GnbSearch';

/**
 * 통합 GNB — 로그인 전/후 모두 같은 상단 바를 쓴다.
 *
 * 콘텐츠 서비스(교보·밀리·리디)의 표준 골격:
 *   로고 · 주 메뉴 · 검색창 · (알림 · 추가 · 프로필 | 로그인 · 시작하기)
 * 로그인했다고 셸이 사이드바로 바뀌는 건 어드민 도구의 문법이다.
 */
type GnbUser = {
  userId: string;
  photoUrl: string | null;
  displayName: string;
  username: string | null;
};

type GnbProps = {
  /** null이면 비로그인 방문자 */
  user: GnbUser | null;
};

export const Gnb = ({ user }: GnbProps) => {
  return (
    // 그림자는 "떠 있는 것"에만 — sticky 헤더는 1px 선으로 충분하다
    <header className='sticky top-0 z-40 border-b border-line bg-card'>
      <div className='mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 lg:gap-6'>
        {/*
          베타 표기는 GNB 에 둔다 — 모든 화면이 지나는 유일한 자리다.
          랜딩에만 적으면 로그인해서 쓰는 사람은 자기가 베타를 쓰는 줄 모른다.
          정식 오픈 때 이 span 하나만 지우면 된다.
        */}
        <div className='flex shrink-0 items-baseline gap-1.5'>
          <Link href='/' className='text-lg font-bold text-primary'>
            page0127
          </Link>
          <span className='rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium leading-none text-primary'>
            베타
          </span>
        </div>

        <GnbNav isLoggedIn={!!user} />

        {/* 검색 — 책 서비스의 GNB에서 검색창은 장식이 아니라 중심이다 */}
        <div className='ml-auto hidden w-full max-w-xs sm:block lg:max-w-sm'>
          <GnbSearch />
        </div>

        <div className='flex shrink-0 items-center gap-1.5 sm:ml-0 ml-auto'>
          {/* 모바일에선 검색창 대신 아이콘으로 진입 */}
          <Link
            href='/books/all'
            aria-label='도서 검색'
            className='flex size-9 items-center justify-center rounded-full text-text-subtle transition-colors hover:bg-sunken hover:text-text-strong sm:hidden'
          >
            <Search className='size-5' />
          </Link>

          {user ? (
            <>
              <NotificationDropdown userId={user.userId} />
              <Button asChild size='sm' className='ml-1'>
                <Link href='/books/add'>
                  <Plus aria-hidden='true' />
                  <span className='hidden md:inline'>도서 추가</span>
                  <span className='sr-only md:hidden'>도서 추가</span>
                </Link>
              </Button>
              <div className='ml-1'>
                <ProfileDropdown
                  photoUrl={user.photoUrl}
                  displayName={user.displayName}
                  username={user.username}
                />
              </div>
            </>
          ) : (
            <>
              <Button asChild variant='ghost' className='hidden sm:inline-flex'>
                <Link href='/login'>로그인</Link>
              </Button>
              <Button asChild>
                <Link href='/login'>시작하기</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
