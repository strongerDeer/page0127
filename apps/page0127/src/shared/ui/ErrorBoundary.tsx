'use client';

import { Component, type ReactNode } from 'react';

import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Error Boundary 컴포넌트
 *
 * 학습 포인트:
 * - React Error Boundary: 하위 컴포넌트에서 발생한 에러를 캐치
 * - Class Component: Error Boundary는 아직 함수형 컴포넌트로 구현 불가
 * - getDerivedStateFromError: 에러 발생 시 상태 업데이트
 * - componentDidCatch: 에러 로깅용
 *
 * 사용법:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // 에러 발생 시 상태 업데이트
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // 에러 로깅
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  // 에러 상태 리셋
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback UI가 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <div className='flex min-h-screen items-center justify-center p-4'>
          <Card className='w-full max-w-md'>
            <CardHeader>
              <CardTitle className='text-destructive'>
                오류가 발생했습니다
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <p className='text-muted-foreground'>
                예상치 못한 오류가 발생했습니다. 다시 시도해주세요.
              </p>

              {/* 개발 환경에서만 에러 메시지 표시 */}
              {process.env.NODE_ENV === 'development' &&
                this.state.error && (
                  <div className='rounded-md bg-destructive/10 p-3'>
                    <p className='text-sm font-medium text-destructive'>
                      에러 메시지:
                    </p>
                    <p className='mt-1 text-sm text-destructive/90'>
                      {this.state.error.message}
                    </p>
                  </div>
                )}

              <div className='flex gap-2'>
                <Button onClick={this.handleReset} className='flex-1'>
                  다시 시도
                </Button>
                <Button
                  variant='outline'
                  onClick={() => window.location.reload()}
                  className='flex-1'
                >
                  페이지 새로고침
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
