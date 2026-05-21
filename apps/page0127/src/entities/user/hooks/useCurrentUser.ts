'use client';

import { useQuery } from '@tanstack/react-query';

import { userKeys } from '../model/queryKeys';

/**
 * 현재 로그인한 사용자 정보 조회 훅
 *
 * 학습 포인트:
 * - React Query로 사용자 세션 관리
 * - 클라이언트 측 인증 상태 확인
 */

type CurrentUser = {
  id: string;
  email: string;
};

async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    // successResponse 형태: { success: true, data: {...} }
    const data = result.data || result;
    return data;
  } catch (error) {
    console.error('getCurrentUser - error:', error);
    return null;
  }
}

export const useCurrentUser = () => {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5분
    retry: false,
    throwOnError: false,
  });
};
