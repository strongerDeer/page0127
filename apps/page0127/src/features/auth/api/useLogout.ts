import { useRouter } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/client';

/**
 * 로그아웃 Custom Hook
 *
 * @description
 * - Supabase의 signOut을 사용한 로그아웃 로직
 * - 로그아웃 후 자동으로 홈으로 리디렉션
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

    // 로그아웃 후에는 홈으로 보낸다. 이 서비스는 비로그인 상태에서도 전체 도서·공개
    // 서재를 볼 수 있어서, 로그인 화면으로 보내면 둘러볼 길을 막는다(계정 삭제도 홈으로 간다).
    router.push('/');
    // Server Component가 렌더해 둔 인증 상태(헤더 아바타 등)를 버린다.
    // 이게 없으면 이동 후에도 로그인된 화면이 잠깐 남는다.
    router.refresh();
  };

  return {
    logout,
  };
};
