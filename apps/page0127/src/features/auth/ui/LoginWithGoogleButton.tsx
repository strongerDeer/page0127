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

// 디자인 시스템의 Button 에서 그대로 물려받는다. 예전에는 여기에 크기·variant
// 목록을 손으로 적어 뒀는데, 그러면 시스템이 이름을 바꿀 때(`default` → `md`)
// 이 파일만 옛 이름을 들고 남는다. 실제로 그 상태였고 타입 검사가 잡았다.
type ButtonStyleProps = Pick<
  React.ComponentProps<typeof Button>,
  'size' | 'variant'
>;

type LoginWithGoogleButtonProps = ButtonStyleProps & {
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
