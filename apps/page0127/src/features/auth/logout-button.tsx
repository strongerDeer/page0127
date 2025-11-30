'use client';

import { useRouter } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/client';
import { Button } from '@/shared/ui/button';

/**
 * 로그아웃 버튼 컴포넌트
 *
 * - Supabase signOut으로 로그아웃
 * - 로그아웃 후 로그인 페이지로 리디렉션
 */
export const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();

    // 로그아웃 처리
    await supabase.auth.signOut();

    // 로그인 페이지로 리디렉션
    router.push('/login');
  };

  return (
    <Button onClick={handleLogout} variant='outline'>
      로그아웃
    </Button>
  );
};
