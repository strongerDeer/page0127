import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/lib/utils';

/*
  페이지 외부 래퍼
  - min-h-screen: 배경이 뷰포트를 꽉 채우도록
  - 반응형 패딩: 모바일 24px(p-6) / 데스크톱 40px(md:p-10) — 전 페이지 통일 기준
  - bg: 공개 서재처럼 배경을 한 단 낮춰야 하는 페이지용 옵션

  기존 gradient(slate→blue→indigo)는 폐기했다. 파스텔 그라디언트 배경은
  실서비스에 없고(교보·밀리 모두 단색), AI 랜딩의 대표 신호다.
  대신 종이 톤을 한 단 눌러 책장 바닥을 만든다.
*/
const outerVariants = cva('min-h-screen p-6 md:p-10', {
  variants: {
    bg: {
      default: '',
      sunken: 'bg-sunken',
    },
  },
  defaultVariants: { bg: 'default' },
});

/*
  내부 컨텐츠 래퍼: 콘텐츠 타입별 최대 너비 (4단계)
  - narrow (3xl): 단일 컬럼 리스트·설정 폼 — feed, notifications, search, settings
  - content (4xl): 상세·폼 — 책 상세/정보/추가/편집, 취향 분석
  - library (6xl): 공개 서재
  - wide (7xl): 데이터 그리드 — 대시보드, 전체 도서
*/
const innerVariants = cva('mx-auto', {
  variants: {
    width: {
      narrow: 'max-w-3xl',
      content: 'max-w-4xl',
      library: 'max-w-6xl',
      wide: 'max-w-7xl',
    },
  },
  defaultVariants: { width: 'content' },
});

type PageContainerProps = VariantProps<typeof outerVariants> &
  VariantProps<typeof innerVariants> & {
    children: React.ReactNode;
    className?: string;
  };

/**
 * 페이지 공통 컨테이너
 *
 * 모든 페이지의 최대 너비와 바깥 여백을 한 곳에서 표준화한다.
 * 페이지마다 max-width와 패딩을 손으로 박지 않고 이 컴포넌트의 variant로 제어한다.
 *
 * @example
 * // 단일 컬럼 리스트 (feed, notifications, search)
 * <PageContainer width="narrow" className="space-y-6">{children}</PageContainer>
 *
 * // 데이터 그리드 (대시보드, 전체 도서)
 * <PageContainer width="wide" className="space-y-8">{children}</PageContainer>
 *
 * // 공개 서재 (배경을 한 단 눌러 책장 바닥을 만든다)
 * <PageContainer width="library" bg="sunken">{children}</PageContainer>
 */
export const PageContainer = ({
  children,
  width,
  bg,
  className,
}: PageContainerProps) => {
  return (
    <div className={outerVariants({ bg })}>
      {/* className은 내부 래퍼로 전달 → space-y 같은 세로 리듬을 페이지가 주입 */}
      <div className={cn(innerVariants({ width }), className)}>{children}</div>
    </div>
  );
};
