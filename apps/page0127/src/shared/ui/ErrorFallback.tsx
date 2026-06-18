'use client';

import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

type ErrorFallbackProps = {
  // 개발 환경에서만 노출할 에러 객체 (digest는 Next.js error.tsx에서만 존재)
  error?: (Error & { digest?: string }) | null;
  // 1차 복구: 다시 시도
  onRetry: () => void;
  // 2차 동선: 라벨/동작을 호출부가 결정 (홈으로 / 새로고침 등)
  secondaryLabel: string;
  onSecondary: () => void;
};

/**
 * 전체화면 에러 fallback (공통 UI)
 *
 * 학습 포인트:
 * - error.tsx(Next 규칙)와 ErrorBoundary(Class)가 같은 fallback을 복붙하던 걸 추출
 * - 둘의 차이는 "2차 동선"뿐 → secondaryLabel/onSecondary prop으로만 분기
 * - 1차(onRetry)·2차(onSecondary)로 복구 동선을 분리 = Day 62의 복구 단계 설계
 */
export const ErrorFallback = ({
  error,
  onRetry,
  secondaryLabel,
  onSecondary,
}: ErrorFallbackProps) => {
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

          {/* 개발 환경에서만 에러 메시지 표시 (운영 노출 방지) */}
          {process.env.NODE_ENV === 'development' && error && (
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
            <Button onClick={onRetry} className='flex-1'>
              다시 시도
            </Button>
            <Button
              variant='outline'
              onClick={onSecondary}
              className='flex-1'
            >
              {secondaryLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
