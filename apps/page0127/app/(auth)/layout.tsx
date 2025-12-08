import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

/**
 * 인증 페이지 레이아웃 (로그인, 회원가입 등)
 *
 * 학습 포인트:
 * - Route Group의 layout.tsx에서 접근 제어 처리
 * - 이미 로그인한 사용자는 대시보드로 리디렉션
 * - 하위 모든 페이지에 자동 적용 (login, signup 등)
 */
const AuthLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 이미 로그인한 사용자는 대시보드로 리디렉션
  if (user) {
    redirect('/dashboard');
  }

  return <>{children}</>;
};

export default AuthLayout;
