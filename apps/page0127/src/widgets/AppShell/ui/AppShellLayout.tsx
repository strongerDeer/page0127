import { Gnb } from '@/widgets/Gnb';

import { BottomTabBar } from './BottomTabBar';
import { SiteFooter } from './SiteFooter';

import type { ShellUser } from '../api/getShellUser';

// 프레젠테이션 전용 셸 (인증 게이트 없음)
// - 인증/리디렉션은 호출하는 레이아웃이 책임지고, 여기선 화면 구성만 한다
// - 로그인 전/후 모두 같은 상단 GNB를 쓴다 — 로그인했다고 셸이
//   사이드바로 바뀌는 건 콘텐츠 서비스가 아니라 어드민 도구의 문법이다
type AppShellLayoutProps = {
  /** null이면 비로그인 방문자 */
  user: ShellUser | null;
  children: React.ReactNode;
};

export const AppShellLayout = ({ user, children }: AppShellLayoutProps) => {
  return (
    <div className='flex min-h-screen flex-col'>
      {/*
        스킵 링크: 키보드 사용자가 반복되는 GNB를 건너뛰고 본문으로 바로 이동.
        sr-only로 평소엔 숨기고, 포커스되면(focus:) 좌상단에 드러난다.
      */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground'
      >
        본문 바로가기
      </a>
      <Gnb user={user} />
      {/*
        탭바 높이 확보는 이제 푸터가 맡는다 — 본문 다음에 푸터가 오므로
        여기서도 pb 를 주면 본문과 푸터 사이에 빈 띠가 두 번 생긴다.
      */}
      <main id='main-content' className='flex-1'>
        {children}
      </main>
      {/*
        푸터는 로그인 여부와 상관없이 붙인다. 문의·개인정보처리방침·이용약관은
        쓰다가 막힌 사람(=로그인한 사람)이 가장 필요로 하는 것들이다.
        탭바가 있는 모바일에서는 푸터 끝이 가리므로 그만큼 아래 여백을 더한다.
      */}
      <SiteFooter className={user ? 'pb-16 md:pb-0' : undefined} />
      {/* 하단 탭 메뉴는 전부 로그인 전용 라우트 → 비로그인에겐 숨긴다 */}
      {user && <BottomTabBar username={user.username} />}
    </div>
  );
};
