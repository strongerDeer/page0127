import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

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

    // React Query 캐시를 통째로 비운다.
    //
    // 왜 필수인가: useCurrentUser 는 staleTime 5분이라, 이걸 안 지우면 로그아웃 뒤에도
    // 5분간 currentUser 가 살아 있다. 그러면 "로그인해야 보이는" 입력창(댓글 폼 등)이
    // 그대로 뜨고, 눌러서 요청하면 서버가 401 을 돌려줘 실패한다.
    // router.refresh() 는 Server Component 만 다시 그리므로 이 캐시를 건드리지 못한다.
    //
    // clear()로 통째로 비우는 이유: 남의 계정으로 다시 로그인했을 때 이전 사용자의
    // 피드·댓글 캐시가 섞이면 안 된다.
    queryClient.clear();

    // 로그아웃 후에는 홈으로 보낸다. 이 서비스는 비로그인 상태에서도 전체 도서·공개
    // 서재를 볼 수 있어서, 로그인 화면으로 보내면 둘러볼 길을 막는다(계정 삭제도 홈으로 간다).
    router.push('/');
    // Server Component가 렌더해 둔 인증 상태(헤더 아바타 등)를 버린다.
    router.refresh();
  };

  return {
    logout,
  };
};
