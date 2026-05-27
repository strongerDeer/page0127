import { createClient } from '@/shared/config/supabase/server';

import { AppShellLayout, getShellUser } from '@/widgets/AppShell';
import { Header } from '@/widgets/Header';

/**
 * 공개 페이지 레이아웃 (모두 접근 가능)
 *
 * 학습 포인트:
 * - 접근 제어(리디렉션)는 없지만, 로그인 여부에 따라 레이아웃을 분기한다
 * - 로그인 사용자: 보호 영역과 동일한 사이드바 셸(AppShellLayout)로 일관성 유지
 * - 비로그인 방문자: 기존 공개 헤더 (랜딩 정상 노출)
 */
const PublicLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인 사용자 → 사이드바 셸 (인증 게이트 없는 프레젠테이션 셸)
  if (user) {
    const shellUser = await getShellUser(user.id);
    return <AppShellLayout {...shellUser}>{children}</AppShellLayout>;
  }

  // 비로그인 방문자 → 기존 공개 헤더
  return (
    <>
      <Header />
      {children}
    </>
  );
};

export default PublicLayout;
