import { createClient } from '@/shared/config/supabase/client';
import { toSafeRedirect } from '@/shared/lib/auth/safeRedirect';

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

  /** @param next 로그인 후 돌아갈 내부 경로. 없으면 콜백이 본인 서재로 보낸다 */
  const login = async (next?: string | null) => {
    const supabase = createClient();

    // OAuth 리디렉션 URL 설정
    // - 항상 "지금 접속 중인 브라우저 도메인"(location.origin)을 우선한다.
    //   → 로컬은 localhost:3000, 프로덕션은 배포 도메인이 자동으로 잡힘.
    // - NEXT_PUBLIC_* 는 빌드 타임에 값이 박혀서, localhost로 빌드하면
    //   프로덕션에서도 localhost로 돌아오는 문제가 있었음 → 환경변수는 폴백으로만.
    const siteUrl = location.origin || process.env.NEXT_PUBLIC_SITE_URL;

    // 로그인 뒤 돌아갈 곳을 콜백까지 들려 보낸다.
    // 여기서 한 번 걸러도 콜백에서 다시 검증한다 — 콜백 URL 은 사용자가 직접
    // 만들어 열 수 있어서 클라이언트 검증만으로는 못 막는다.
    const safeNext = toSafeRedirect(next);
    const callbackUrl = safeNext
      ? `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`
      : `${siteUrl}/auth/callback`;

    // Google OAuth 로그인 시작
    // signInWithOAuth는 즉시 리디렉션 발생 → 외부 Google 로그인 페이지로 이동
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // OAuth 콜백 후 리디렉션될 URL
        // - 로컬: http://localhost:3000/auth/callback
        // - 프로덕션: https://yourdomain.com/auth/callback (환경 변수 설정 필요)
        redirectTo: callbackUrl,
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
