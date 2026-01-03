'use client';

import { useState } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * React Query Provider
 *
 * 학습 포인트:
 * - Client Component로 전역 상태 관리
 * - useState로 QueryClient 인스턴스 생성 (리렌더링 시 재생성 방지)
 * - 모든 하위 컴포넌트에서 React Query 사용 가능
 */
export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1분 동안 데이터를 fresh로 간주
            gcTime: 5 * 60 * 1000, // 5분 후 캐시에서 제거
            refetchOnWindowFocus: true, // 윈도우 포커스 시 자동 refetch (탭 전환 시 최신 데이터 가져오기)
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
