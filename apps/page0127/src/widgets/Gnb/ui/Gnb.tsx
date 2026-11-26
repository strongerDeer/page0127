import { Button } from '@repo/ui';

import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

import { NotificationDropdown } from '@/features/notification';
import { ProfileDropdown } from '@/features/profile';

import { AddBookButton } from './AddBookButton';
import { GnbNav } from './GnbNav';
import { GnbSearch } from './GnbSearch';
import { MobileBookSearch } from './MobileBookSearch';
import { TocMenu } from './TocMenu';

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
      <div className='page-width flex h-16 items-center gap-2 sm:gap-3 lg:gap-6'>
        {/* 로고는 언제나 홈 — 내 서재는 메뉴·프로필에서 간다 */}
        <IntentPrefetchLink
          href='/'
          className='shrink-0 text-lg font-bold text-primary'
        >
          page0127.
        </IntentPrefetchLink>

        <GnbNav isLoggedIn={!!user} username={user?.username ?? null} />

        {/* 검색 — 책 서비스의 GNB에서 검색창은 장식이 아니라 중심이다 */}
        {/* min-w-0: 폭이 모자랄 때 줄어드는 쪽은 검색창이다(메뉴는 shrink-0) */}
        <div className='ml-auto hidden w-full min-w-0 max-w-xs sm:block lg:max-w-sm'>
          <GnbSearch />
        </div>

        <div className='flex shrink-0 items-center gap-1.5 sm:ml-0 ml-auto'>
          {/* 모바일에선 검색창 대신 아이콘으로 진입 */}
          <MobileBookSearch />

          {user ? (
            <>
              {/*
                알림 종은 PC·폰 모두 머리글에 — 하단 탭이 PC 상단 메뉴와 같은 네 칸이 되면서
                알림 칸이 빠졌다(2026-11-26 HJ). 읽지 않은 수 배지도 이 종에 붙는다.
              */}
              <NotificationDropdown userId={user.userId} />
              <AddBookButton />
              {/*
                프로필 드롭다운은 데스크톱에서만 — 모바일에선 같은 내용(내 서재 묶음·설정·로그아웃)이
                ☰ 목차 안에 있다. 320px 폰에서 머리글이 40px 넘쳐 페이지가 좌우로 흔들려서
                아이콘 하나를 목차로 옮겼다(2026-11-24 HJ, C안).
              */}
              <div className='hidden md:ml-1 md:block'>
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
                <IntentPrefetchLink href='/login'>로그인</IntentPrefetchLink>
              </Button>
              <Button asChild>
                <IntentPrefetchLink href='/login'>시작하기</IntentPrefetchLink>
              </Button>
            </>
          )}

          {/*
            ☰ 목차 — PC·폰 모두(2026-11-26 HJ). 하루 한 번(오늘의 문장·필사)과 소개·공지·문의가 여기 있다.
            폰에선 프로필 아바타 대신 목차 맨 위가 내 이름·내 서재 묶음·로그아웃을 맡는다.
          */}
          <TocMenu
            user={
              user
                ? {
                    photoUrl: user.photoUrl,
                    displayName: user.displayName,
                    username: user.username,
                  }
                : null
            }
          />
        </div>
      </div>
    </header>
  );
};
