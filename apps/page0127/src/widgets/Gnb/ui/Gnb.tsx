import { Button } from '@repo/ui';

import { IntentPrefetchLink } from '@/shared/ui/IntentPrefetchLink';

import { NotificationDropdown } from '@/features/notification';
import { ProfileDropdown } from '@/features/profile';

import { AddBookButton } from './AddBookButton';
import { GnbNav } from './GnbNav';
import { GnbSearch } from './GnbSearch';
import { MobileBookSearch } from './MobileBookSearch';
import { MobileTocMenu } from './MobileTocMenu';

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
                알림 종은 데스크톱 머리글에만 — 모바일은 하단 탭바 '알림' 칸이 같은 일을 하고
                읽지 않은 수 배지도 거기 붙는다(2026-11-24 HJ, 메뉴 겹침 정리 A안).
                display:none 으로만 숨겨 실시간 구독·앱 아이콘 숫자(useAppBadge)는 모바일에서도 그대로 돈다.
              */}
              <div className='hidden md:block'>
                <NotificationDropdown userId={user.userId} />
              </div>
              <AddBookButton />
              {/*
                프로필 드롭다운은 데스크톱에서만 — 모바일에선 같은 내용(내 서재·설정·로그아웃)이
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
            모바일 목차 — 주 메뉴(GnbNav)가 숨는 768px 아래에서만 보인다.
            ☰ 가 하나 늘면서 로그인 상태 360px 폭에서 12px 넘쳤다 → 모바일에서만 간격을 줄였다(gap-2, ml-1 → md:ml-1).
          */}
          <MobileTocMenu
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
