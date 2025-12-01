'use client';

import { Button } from '@/shared/ui/button';

import { useLogout } from '../api/useLogout';

/**
 * 로그아웃 버튼 UI 컴포넌트
 *
 * @description
 * - useLogout Hook을 사용한 로그아웃 버튼
 * - Props를 통해 버튼 스타일 커스터마이징 가능
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <LogoutButton />
 *
 * // 커스터마이징
 * <LogoutButton
 *   size="sm"
 *   variant="destructive"
 *   className="w-full"
 * />
 * ```
 */

type LogoutButtonProps = {
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

export const LogoutButton = ({
  size = 'default',
  className,
  variant = 'outline',
  children = '로그아웃',
}: LogoutButtonProps) => {
  const { logout } = useLogout();

  return (
    <Button
      onClick={logout}
      variant={variant}
      size={size}
      className={className}
    >
      {children}
    </Button>
  );
};
