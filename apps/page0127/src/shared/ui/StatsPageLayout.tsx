import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/lib/utils';

// 페이지 외부 래퍼: 배경 색상 variant
const pageVariants = cva('min-h-screen p-6 md:p-10', {
  variants: {
    bg: {
      // Dashboard: 배경 없음 (앱 전체 배경 사용)
      default: '',
      // PublicLibrary: 자체 그라디언트 배경
      gradient: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
    },
  },
  defaultVariants: { bg: 'default' },
});

// 내부 컨텐츠 래퍼: 최대 너비 variant
const innerVariants = cva('mx-auto space-y-8', {
  variants: {
    maxWidth: {
      '6xl': 'max-w-6xl',
      '7xl': 'max-w-7xl',
    },
  },
  defaultVariants: { maxWidth: '7xl' },
});

type StatsPageLayoutProps = VariantProps<typeof pageVariants> &
  VariantProps<typeof innerVariants> & {
    children: React.ReactNode;
    className?: string;
  };

/**
 * 통계 페이지 공통 레이아웃
 *
 * Dashboard와 PublicLibrary가 같은 구조를 공유한다.
 * variant로 배경색과 최대 너비를 제어한다.
 *
 * @example
 * // Dashboard (기본값)
 * <StatsPageLayout>{children}</StatsPageLayout>
 *
 * // PublicLibrary (그라디언트 배경, 좁은 너비)
 * <StatsPageLayout bg="gradient" maxWidth="6xl">{children}</StatsPageLayout>
 */
export const StatsPageLayout = ({
  children,
  bg,
  maxWidth,
  className,
}: StatsPageLayoutProps) => {
  return (
    <div className={pageVariants({ bg })}>
      <div className={cn(innerVariants({ maxWidth }), className)}>
        {children}
      </div>
    </div>
  );
};
