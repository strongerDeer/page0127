import { createClient } from '@/shared/config/supabase/server';

import { AppShellLayout, getShellUser } from '@/widgets/AppShell';

/**
 * 공개 페이지 레이아웃 (모두 접근 가능)
 *
 * 학습 포인트:
 * - 접근 제어(리디렉션)는 없다 — 로그인 여부는 GNB 우측 영역만 바꾼다
 * - 로그인 전/후 셸이 같아야 서비스가 하나의 화면 언어를 갖는다
 */
const PublicLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const shellUser = user ? await getShellUser(user.id) : null;

  return <AppShellLayout user={shellUser}>{children}</AppShellLayout>;
};

export default PublicLayout;
