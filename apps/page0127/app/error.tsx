'use client';

import { useEffect } from 'react';

import { ErrorFallback } from '@repo/ui';
import * as Sentry from '@sentry/nextjs';
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

/**
 * '홈으로'는 일부러 새로고침 이동이다 (router.push 가 아니다).
 *
 * 에러 화면까지 왔다면 클라이언트 상태가 망가졌을 수 있다. 특히 배포 직후 옛 JS 조각을
 * 못 받는 ChunkLoadError 는 router.push 로 가면 같은 조각을 다시 요청해 또 실패한다.
 * 페이지를 새로 받아야 풀린다 — 그래서 린트 규칙을 이 한 곳에서만 끈다.
 */
const goHomeWithReload = () => {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 위 사유
  window.location.href = '/';
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
      onSecondary={goHomeWithReload}
    />
  );
};

export default Error;
