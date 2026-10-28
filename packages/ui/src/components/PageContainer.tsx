import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn';

const outerVariants = cva('min-h-screen py-6 md:py-10', {
  variants: {
    bg: {
      default: 'bg-background',
      sunken: 'bg-sunken',
    },
  },
  defaultVariants: { bg: 'default' },
});

type PageContainerProps = VariantProps<typeof outerVariants> & {
  children: React.ReactNode;
  className?: string;
};

/**
 * 모든 페이지는 page-width를 공유한다: 최대 1280px(좌우 여백 포함),
 * 모바일 24px / 데스크톱 40px. GNB·푸터·프로필 띠도 같은 기준을 쓴다.
 * className은 내부 래퍼의 세로 리듬 등에 사용한다.
 * main 랜드마크는 AppShell에서 제공한다.
 */
export const PageContainer = ({
  children,
  bg,
  className,
}: PageContainerProps) => (
  <div className={outerVariants({ bg })}>
    <div className={cn('page-width', className)}>{children}</div>
  </div>
);
