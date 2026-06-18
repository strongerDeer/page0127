'use client';

import { useEffect } from 'react';

import { ErrorFallback } from '@/shared/ui/ErrorFallback';

import './globals.css';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * 전역 에러 페이지 (Root Layout 에러 대비)
 *
 * 학습 포인트:
 * - global-error.tsx: error.tsx가 못 잡는 Root Layout 에러까지 잡는 최후의 보루
 * - Root Layout을 "대체"하므로 반드시 자체 <html>/<body>를 렌더해야 함
 * - layout이 빠지므로 globals.css(Tailwind)를 직접 import해야 스타일이 적용됨
 * - 프로덕션에서만 활성화 (dev에서는 Next 에러 오버레이가 먼저 뜸)
 *
 * 위치: app/global-error.tsx
 * 범위: Root Layout 포함 전체 (error.tsx 범위의 상위)
 */
const GlobalError = ({ error, reset }: GlobalErrorProps) => {
  useEffect(() => {
    // layout 에러는 가장 치명적이라 반드시 로깅 (실제로는 Sentry 등으로 전송)
    console.error('Global (root layout) Error:', error);
  }, [error]);

  return (
    <html lang='ko-KR'>
      <body className='antialiased'>
        <ErrorFallback
          error={error}
          onRetry={() => reset()}
          secondaryLabel='홈으로'
          onSecondary={() => (window.location.href = '/')}
        />
      </body>
    </html>
  );
};

export default GlobalError;
