import { useRouter } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/client';

/**
 * 로그아웃 Custom Hook
 *
 * @description
 * - Supabase의 signOut을 사용한 로그아웃 로직
 * - 로그아웃 후 자동으로 로그인 페이지로 리디렉션
 * - UI와 비즈니스 로직을 분리하여 재사용성 향상
 *
 * @example
 * ```tsx
 * const { logout } = useLogout();
 *
 * <button onClick={logout}>로그아웃</button>
 * ```
 */
export const useLogout = () => {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();

    // Supabase 로그아웃 처리
    // signOut은 다음을 수행:
    // 1. 세션 무효화 (서버)
    // 2. 로컬 스토리지에서 토큰 삭제 (클라이언트)
    // 3. 모든 auth 상태 초기화
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('로그아웃 오류:', error.message);
      return;
    }

    // 로그아웃 성공 시 로그인 페이지로 리디렉션
    router.push('/login');
  };

  return {
    logout,
  };
};
