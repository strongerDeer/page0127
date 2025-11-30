'use client';

import { createClient } from '@/shared/config/supabase/client';
import { Button } from '@/shared/ui/button';
import { Icons } from '@repo/icons';
/**
 * Google 로그인 버튼 컴포넌트
 *
 * - Supabase signInWithOAuth로 Google 로그인 시작
 * - redirectTo: OAuth 콜백 후 돌아올 URL 지정
 */
export const LoginWithGoogle = () => {
  const handleGoogleLogin = async () => {
    const supabase = createClient();

    // Google OAuth 로그인 시작
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // OAuth 콜백 후 리디렉션될 URL
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('로그인 오류:', error.message);
    }
  };

  return (
    <Button onClick={handleGoogleLogin} className='w-full' size='lg'>
      <Icons name='google' />

      Google로 로그인
    </Button>
  );
};
