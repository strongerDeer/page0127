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
      { data?: CurrentUser } & Partial<CurrentUser>
    >('/auth/me');
    // successResponse 형태({ data }) 우선, 아니면 본문 자체를 사용
    return (data.data ?? data) as CurrentUser;
  } catch {
    // 401(비로그인) 등은 정상 흐름 → 조용히 null 반환 (인터셉터에서 로깅)
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
