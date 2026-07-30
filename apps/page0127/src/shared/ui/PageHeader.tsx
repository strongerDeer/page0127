import { cn } from '@/shared/lib/utils';

type PageHeaderProps = {
  /** 페이지 제목. `<h1>` 으로 렌더된다 — 페이지당 하나만 둔다 */
  title: React.ReactNode;
  /** 제목 아래 한 줄 설명 */
  description?: React.ReactNode;
  /**
   * 제목 위에 놓을 것. 목록으로 돌아가는 링크 같은 것에 쓴다.
   * (제목보다 위에 있어야 "어디서 왔는지"가 먼저 읽힌다)
   */
  above?: React.ReactNode;
  className?: string;
};

/**
 * 페이지 제목 + 설명
 *
 * 학습 포인트:
 * - 같은 조합이 8곳에서 손으로 쓰이다 **간격이 mt-1 과 mt-2 로 갈렸다.**
 *   어느 쪽이 맞는지 아무도 모르는 상태가 컴포넌트가 필요하다는 신호였다.
 * - 여기서 8px(mt-2)로 통일한다. 제목이 28px(데스크톱)라 4px 는 붙어 보인다.
 * - `<h1>` 을 이 컴포넌트가 만든다. 페이지마다 하나만 두고, 섹션 제목은
 *   `.heading-2` 를 직접 쓴다.
 */
export const PageHeader = ({
  title,
  description,
  above,
  className,
}: PageHeaderProps) => (
  <header className={className}>
    {above}
    {/* 뒤로가기와 제목 사이는 제목·설명 사이보다 넓게 둔다 — 성격이 다른 요소라
        같은 간격이면 한 덩어리로 읽힌다 */}
    {/* 색은 `.heading-1` 이 갖는다 — text-text-strong 을 여기서 다시 주지 않는다 */}
    <h1 className={cn('heading-1', above && 'mt-4')}>
      {title}
    </h1>
    {description && (
      <p className='mt-2 text-sm text-text-subtle'>{description}</p>
    )}
  </header>
);
