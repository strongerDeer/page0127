import { ClientAppShellLayout } from '@/widgets/AppShell/ui/ClientAppShellLayout';

/**
 * 캐시되는 공개 페이지 레이아웃 — 책 정보·소개·약관·업데이트·문의
 *
 * (public) 레이아웃과 화면은 같지만 서버에서 로그인(쿠키)을 읽지 않는다.
 * 그래야 이 아래 페이지들을 CDN 에 미리 만들어 두고(ISR) 서버 함수를 깨우지 않는다.
 * 로그인에 따라 달라지는 부분(GNB 프로필·담기 버튼·내 메모)은 브라우저에서 채운다.
 *
 * ⚠️ 이 그룹의 페이지에서 cookies()·headers()·getCurrentUser()·서버 createClient() 를 쓰면
 * 그 페이지는 다시 매 요청 렌더링으로 돌아간다. 공용 데이터는 createAnonClient 로 읽을 것.
 */
const StaticPublicLayout = ({ children }: { children: React.ReactNode }) => (
  <ClientAppShellLayout>{children}</ClientAppShellLayout>
);

export default StaticPublicLayout;
