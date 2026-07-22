'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

import { ErrorFallback } from '@/shared/ui/ErrorFallback';

/**
 * 전역 에러 페이지 (Next.js 파일 규칙)
 *
 * 학습 포인트:
 * - Next.js error.tsx: 해당 라우트 세그먼트의 모든 에러 캐치
 * - SSR + CSR 에러 모두 처리 가능
 * - reset() 함수로 에러 상태 초기화
 * - layout.tsx 에러는 캐치하지 못함 (상위에 global-error.tsx 필요)
 * - fallback UI는 ErrorBoundary와 공통 ErrorFallback을 공유 (2차 동선만 '홈으로')
 *
 * 위치: app/error.tsx
 * 범위: 전체 앱의 에러 (layout.tsx 제외)
 */
type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const Error = ({ error, reset }: ErrorProps) => {
  useEffect(() => {
    // 프로덕션 에러 추적: Sentry로 전송 + 로컬 콘솔에도 남긴다
    Sentry.captureException(error);
    console.error('Global Error:', error);
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      onRetry={() => reset()}
      secondaryLabel='홈으로'
      onSecondary={() => (window.location.href = '/')}
    />
  );
};

export default Error;
