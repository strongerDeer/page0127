'use client';

import { Button } from '@/shared/ui/button';
import { Icons } from '@repo/icons';

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
};

export const LoginWithGoogleButton = ({
  size = 'lg',
  className = 'w-full',
  variant = 'default',
  children = 'Google로 로그인',
}: LoginWithGoogleButtonProps) => {
  const { login } = useGoogleLogin();

  return (
    <Button onClick={login} className={className} size={size} variant={variant}>
      <Icons name='google' />
      {children}
    </Button>
  );
};
