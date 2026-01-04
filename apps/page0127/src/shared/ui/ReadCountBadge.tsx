'use client';

import { cn } from '@/shared/lib/utils';

type ReadCountBadgeProps = {
  readCount: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

/**
 * 재독 횟수 뱃지 컴포넌트
 *
 * 학습 포인트:
 * - 재독 횟수를 시각적으로 표시
 * - 1회독은 표시하지 않음 (기본값)
 * - 2회독 이상만 뱃지로 표시
 */
export const ReadCountBadge = ({
  readCount,
  className,
  size = 'md',
}: ReadCountBadgeProps) => {
  // 1회독은 표시하지 않음
  if (readCount <= 1) return null;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-blue-100 font-semibold text-blue-700',
        sizeClasses[size],
        className
      )}
    >
      <svg
        className='h-3 w-3'
        fill='currentColor'
        viewBox='0 0 20 20'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path d='M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z' />
      </svg>
      {readCount}회독
    </span>
  );
};
