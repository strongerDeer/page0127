'use client';

import { useEffect } from 'react';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

/**
 * 전역 에러 페이지 (Next.js 파일 규칙)
 *
 * 학습 포인트:
 * - Next.js error.tsx: 해당 라우트 세그먼트의 모든 에러 캐치
 * - SSR + CSR 에러 모두 처리 가능
 * - reset() 함수로 에러 상태 초기화
 * - layout.tsx 에러는 캐치하지 못함 (상위에 global-error.tsx 필요)
 *
 * 위치: app/error.tsx
 * 범위: 전체 앱의 에러 (layout.tsx 제외)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러 로깅 (실제로는 Sentry 등 에러 추적 서비스로 전송)
    console.error('Global Error:', error);
  }, [error]);

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle className='text-destructive'>오류가 발생했습니다</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground'>
            예상치 못한 오류가 발생했습니다. 다시 시도해주세요.
          </p>

          {/* 개발 환경에서만 에러 메시지 표시 */}
          {process.env.NODE_ENV === 'development' && (
            <div className='rounded-md bg-destructive/10 p-3'>
              <p className='text-sm font-medium text-destructive'>에러 메시지:</p>
              <p className='mt-1 text-sm text-destructive/90'>{error.message}</p>
              {error.digest && (
                <p className='mt-1 text-xs text-destructive/80'>
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className='flex gap-2'>
            <Button onClick={() => reset()} className='flex-1'>
              다시 시도
            </Button>
            <Button
              variant='outline'
              onClick={() => (window.location.href = '/')}
              className='flex-1'
            >
              홈으로
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
