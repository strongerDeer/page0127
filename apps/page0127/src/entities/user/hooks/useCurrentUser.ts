'use client';

import { useQuery } from '@tanstack/react-query';

import { currentUserQueryOptions } from '../api/getCurrentUser';

/**
 * 현재 로그인한 사용자 정보 조회 훅
 *
 * 학습 포인트:
 * - React Query로 사용자 세션 관리
 * - 클라이언트 측 인증 상태 확인
 */

export const useCurrentUser = () => {
  return useQuery(currentUserQueryOptions());
};
