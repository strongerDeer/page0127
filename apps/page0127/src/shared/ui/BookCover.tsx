import Image from 'next/image';

import { cn } from '@/shared/lib/utils';

type BookCoverProps = {
  /** 표지 이미지 URL. 없거나 빈 문자열이면 제목을 조판한다 */
  src?: string | null;
  /** 대체 조판에 쓰이고 이미지의 alt 가 된다 */
  title: string;
  /**
   * 주면 대체 조판이 두 줄이 된다 — 제목은 위, 저자는 아래.
   * 표지를 크게 놓는 곳(상세 페이지·격자)에서 빈 상자가 허전하지 않게 한다.
   */
  author?: string | null;
  /** 부모가 크기를 정하는 비율 박스 안을 채울 때 (next/image 의 fill) */
  fill?: boolean;
  /** fill 이 아닐 때 next/image 에 넘길 고유 크기 */
  width?: number;
  height?: number;
  /** next/image 의 sizes */
  sizes?: string;
  /** 크기·위치는 쓰는 쪽이 정한다 */
  className?: string;
  /**
   * 대체 조판의 기하가 이미지와 다를 때만 쓴다.
   * 이미지는 원본 비율(`h-auto`)로 놓는데 대체 상자에는 비율이 없어
   * `aspect-*` 를 따로 줘야 하는 경우가 있다. className 에 넣으면 이미지까지
   * 크롭되므로 분리했다.
   */
  fallbackClassName?: string;
  /** 장식용 표지라 스크린리더에서 감출 때 (제목이 옆에 이미 있는 경우) */
  decorative?: boolean;
  /** LCP 에 걸리는 큰 표지에만 (next/image 의 priority) */
  priority?: boolean;
};

/**
 * 책 표지 셀 — 도메인 셰이프를 한 곳에서 책임진다
 *
 * 학습 포인트:
 * - `.book-cover` 는 왼쪽이 책등이라 각지고 오른쪽만 둥근 비대칭 radius 다.
 *   Tailwind 로 표현할 수 없어 globals.css 의 유틸로 두고 여기서 붙인다
 * - 크기는 강제하지 않는다. 표지는 문맥마다 다른 크기로 놓인다
 * - 표지가 없으면 제목을 조판한다. 빈 상자보다 무슨 책인지 아는 편이 낫다
 */
export const BookCover = ({
  src,
  title,
  author,
  fill,
  width,
  height,
  sizes,
  className,
  fallbackClassName,
  decorative,
  priority,
}: BookCoverProps) => {
  if (src) {
    return (
      <Image
        src={src}
        alt={decorative ? '' : title}
        aria-hidden={decorative || undefined}
        {...(fill ? { fill: true } : { width, height })}
        sizes={sizes}
        priority={priority}
        className={cn('book-cover object-cover', className)}
      />
    );
  }

  return (
    <span
      aria-hidden={decorative || undefined}
      // 이미지는 원본 비율로 늘어나지만 대체 상자에는 비율이 없다.
      // 이미지가 쓸 예정이던 width/height 를 그대로 상자 크기로 삼아,
      // 호출부가 "이미지일 때/없을 때"를 따로 적지 않게 한다.
      // fallbackClassName 을 준 곳은 기하를 직접 정하겠다는 뜻이므로 비켜준다
      // (인라인 스타일은 클래스를 이기기 때문에 함께 쓰면 클래스가 죽는다)
      style={
        !fill && width && height && !fallbackClassName
          ? { width, height }
          : undefined
      }
      className={cn(
        // bg-sunken 을 주지 않는다. 도메인 셰이프 CSS 가 @layer 밖이라 모든
        // Tailwind 유틸을 이기고, 그 안의 흰 배경 + 책등 음영이 그대로 남는다.
        // 원래 코드도 bg-sunken 을 적었지만 한 번도 적용된 적이 없다 —
        // 대체 상자는 예나 지금이나 "빈 책 표지" 로 보인다. 코드를 사실에 맞춘다.
        'book-cover flex p-2',
        // 저자가 있으면 위아래로 벌려 표지 조판처럼, 없으면 가운데 정렬
        author
          ? 'flex-col justify-between text-left'
          : 'items-center justify-center text-center',
        // 대체 표지는 진짜 표지의 자리를 메우는 것이지 강조 대상이 아니다 —
        // 07 의 weight 3단계 중 400 을 쓴다. 크기는 호출부가 덮을 수 있다(twMerge)
        'text-[10px] leading-snug text-text-faint',
        fill && 'h-full w-full',
        className,
        fallbackClassName
      )}
    >
      <span className='line-clamp-4 break-keep'>{title}</span>
      {author && <span className='line-clamp-1 shrink-0'>{author}</span>}
    </span>
  );
};
