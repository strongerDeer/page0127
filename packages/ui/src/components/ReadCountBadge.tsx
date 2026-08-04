import { cva, type VariantProps } from 'class-variance-authority';
import { BookOpen } from 'lucide-react';

import { cn } from '../lib/cn';

/**
 * 재독 횟수를 표시할지 판정한다.
 *
 * 컴포넌트 밖으로 뺀 이유: "1회독은 배지를 달지 않는다"는 **제품 규칙**이고,
 * 렌더링과 별개로 값이 맞는지 확인할 수 있어야 한다. 호출부가 배지 자리를
 * 미리 비워 둘지 결정할 때도 같은 판정을 써야 한다 —
 * 각자 `count > 1` 을 다시 적기 시작하면 규칙이 갈라진다.
 */
export const shouldShowReadCount = (readCount: number): boolean =>
  Number.isFinite(readCount) && readCount > 1;

// 색은 `bg-accent` + `text-accent-foreground` 짝을 쓴다.
//
// 예전에는 `bg-primary/15` 위에 `text-primary` 를 얹었는데, 그 조합이
// **4.31:1 로 AA(4.5) 미달**이었다. 스토리를 만들자마자 axe 가 잡았다 —
// 이 컴포넌트는 앱 3곳에서 이미 쓰이고 있었지만 스토리가 없어 한 번도
// 검사된 적이 없었다.
//
// 임의 투명도(`/15`)가 문제의 뿌리다. 반투명 색은 깔린 배경에 따라 실제
// 값이 달라져서 토큰 표 어디에도 그 명암비가 적혀 있지 않다. accent 짝은
// 시스템이 라이트·다크 양쪽에서 검산해 둔 값이다
// (라이트 blue/50 위 blue/700 = 5.86, 다크 navy/700 위 흰색 = 8.37).
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full bg-accent font-medium text-accent-foreground',
  {
    // 크기 이름은 시스템 공통(sm/md/lg)이다. Button·Spinner 와 같은 축을 쓴다.
    variants: {
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

type ReadCountBadgeProps = VariantProps<typeof badgeVariants> & {
  /** 몇 번 읽었는지. 1 이하면 아무것도 그리지 않는다 */
  readCount: number;
  className?: string;
};

/**
 * 재독 횟수 배지 — 같은 책을 여러 번 읽었다는 표시
 *
 * 이 서비스에서 재독은 자랑거리라 눈에 띄어야 하지만, 대부분의 책은 1회독이라
 * 그때는 아예 그리지 않는다. 배지가 붙은 것 자체가 신호가 되게 하려는 것이다.
 *
 * 아이콘은 `lucide-react` 를 쓴다. 예전에는 인라인 SVG 를 직접 박아 뒀는데,
 * 시스템의 다른 컴포넌트가 전부 lucide 를 쓰는 상황에서 여기만 손으로 그린
 * 패스를 들고 있으면 아이콘 굵기·크기 규칙이 이 컴포넌트에서만 어긋난다.
 */
export const ReadCountBadge = ({
  readCount,
  className,
  size,
}: ReadCountBadgeProps) => {
  if (!shouldShowReadCount(readCount)) return null;

  return (
    <span className={cn(badgeVariants({ size }), className)}>
      {/* 배지 글자가 이미 "N회독"이라고 말한다 — 아이콘은 장식이라 읽지 않는다 */}
      <BookOpen aria-hidden className='size-3' />
      {readCount}회독
    </span>
  );
};
