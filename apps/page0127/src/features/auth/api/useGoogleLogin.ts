import { createClient } from '@/shared/config/supabase/client';

/**
 * Google OAuth 로그인 Custom Hook
 *
 * @description
 * - Supabase의 signInWithOAuth를 사용한 Google 로그인 로직
 * - UI와 비즈니스 로직을 분리하여 재사용성 향상
 * - 다른 곳에서도 Google 로그인 기능만 필요할 때 사용 가능
 *
 * @example
 * ```tsx
 * const { login, isLoading, error } = useGoogleLogin();
 *
 * <button onClick={login}>Google로 로그인</button>
 * ```
 */
export const useGoogleLogin = () => {
  // TODO: 로딩/에러 상태 추가 (필요시)
  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);

  const login = async () => {
    const supabase = createClient();

    // OAuth 리디렉션 URL 설정
    // 1. 환경 변수가 설정되어 있으면 사용
    // 2. 없으면 location.origin 사용 (브라우저 현재 도메인)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || location.origin;

    // Google OAuth 로그인 시작
    // signInWithOAuth는 즉시 리디렉션 발생 → 외부 Google 로그인 페이지로 이동
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // OAuth 콜백 후 리디렉션될 URL
        // - 로컬: http://localhost:3000/auth/callback
        // - 프로덕션: https://yourdomain.com/auth/callback (환경 변수 설정 필요)
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      console.error('Google 로그인 오류:', error.message);
      // TODO: 에러 상태 업데이트 (필요시)
      // setError(error.message);
    }
  };

  return {
    login,
    // isLoading,  // 필요시 추가
    // error,      // 필요시 추가
  };
};