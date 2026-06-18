'use client';

import { Component, type ReactNode } from 'react';

import { ErrorFallback } from './ErrorFallback';

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

      // 기본 에러 UI (공통 ErrorFallback 사용 — 2차 동선만 새로고침으로 분기)
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleReset}
          secondaryLabel='페이지 새로고침'
          onSecondary={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}
