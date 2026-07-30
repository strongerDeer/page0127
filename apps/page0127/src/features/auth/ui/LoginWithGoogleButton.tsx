'use client';

import { Icons } from '@repo/icons';
import { Button } from '@repo/ui';

import { useGoogleLogin } from '../api/useGoogleLogin';

/**
 * Google 로그인 버튼 UI 컴포넌트
 *
 * @description
 * - useGoogleLogin Hook을 사용한 Google 로그인 버튼
 * - Props를 통해 버튼 스타일 커스터마이징 가능
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <LoginWithGoogleButton />
 *
 * // 커스터마이징
 * <LoginWithGoogleButton
 *   size="sm"
 *   className="w-full"
 *   variant="outline"
 * />
 * ```
 */

type LoginWithGoogleButtonProps = {
  /** 버튼 크기 (shadcn/ui Button size) */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** 버튼 variant (shadcn/ui Button variant) */
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  className?: string;
  children?: React.ReactNode;
  /** 로그인 후 돌아갈 내부 경로. 로그인 페이지가 ?redirect= 에서 받아 넘긴다 */
  next?: string | null;
};

export const LoginWithGoogleButton = ({
  size = 'lg',
  className = 'w-full',
  variant = 'default',
  children = 'Google로 로그인',
  next,
}: LoginWithGoogleButtonProps) => {
  const { login } = useGoogleLogin();

  return (
    <Button
      onClick={() => login(next)}
      className={className}
      size={size}
      variant={variant}
    >
      <Icons name='google' />
      {children}
    </Button>
  );
};
