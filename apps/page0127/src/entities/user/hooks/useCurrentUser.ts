'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';

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
    const { data } = await apiClient.get<
      ({ data?: CurrentUser } & Partial<CurrentUser>) | null
    >('/auth/me');
    // 비로그인이면 서버가 200 + null을 준다 (401이 아니다 — route.ts 주석 참고)
    if (!data) return null;
    // successResponse 형태({ data }) 우선, 아니면 본문 자체를 사용
    return (data.data ?? data) as CurrentUser;
  } catch {
    // 네트워크·서버 오류 → 비로그인으로 취급 (인터셉터에서 로깅)
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
