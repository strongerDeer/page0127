import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

/**
 * 보호된 페이지 레이아웃 (로그인 필수)
 *
 * 학습 포인트:
 * - Route Group의 layout.tsx에서 인증 체크
 * - 로그인하지 않은 사용자는 로그인 페이지로 리디렉션
 * - 하위 모든 페이지에 자동 적용 (dashboard, books 등)
 * - 각 페이지에서 중복 인증 체크 불필요
 */
const ProtectedLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인하지 않은 사용자는 로그인 페이지로 리디렉션
  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
};

export default ProtectedLayout;
