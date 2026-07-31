import { cva, type VariantProps } from 'class-variance-authority';
import Image from 'next/image';

import { cn } from '../lib/cn';

/**
 * 표지 크기 계단.
 *
 * 실측에서 나온 값이다 — 이 컴포넌트는 앱 15곳에서 쓰이는데 높이가
 * 64·80·96·128·160px 다섯 종류로 수렴해 있었다(그 사이 값은 없었다).
 * 계단을 이름으로 고정해 두면 새 화면이 h-[88px] 같은 값을 만들지 않는다.
 *
 * 너비는 정하지 않는다 — `--book-cover-ratio`(1:1.45)에서 파생된다.
 * 예전에는 호출부가 `h-20 w-auto` 로 원본 비율을 따랐고, 그래서 판형이 다른
 * 책이 섞이면 목록의 표지 폭이 들쭉날쭉했다.
 */
const coverSizes = {
  xs: 64, // 달력 셀
  sm: 80, // 목록·랭킹 한 줄
  md: 96, // 활동 카드
  lg: 128, // 분석 결과·비교 화면
  xl: 160, // 랜딩 히어로
} as const;

export type BookCoverSize = keyof typeof coverSizes;

const coverVariants = cva('book-cover', {
  variants: {
    size: {
      xs: 'book-cover-box',
      sm: 'book-cover-box',
      md: 'book-cover-box',
      lg: 'book-cover-box',
      xl: 'book-cover-box',
      /**
       * 컬럼 폭을 그대로 채운다. 높이는 판형 비율에서 나온다.
       * 상세 페이지처럼 표지가 레이아웃의 한 칸을 통째로 차지하는 자리용이다.
       */
      full: 'book-cover-box w-full',
      /** 부모가 크기를 정하는 비율 박스 안을 채운다 (부모에 position 필요) */
      fill: 'h-full w-full',
    },
  },
  defaultVariants: { size: 'sm' },
});

type BookCoverProps = Omit<VariantProps<typeof coverVariants>, 'size'> & {
  /** 표지 이미지 URL. 없거나 빈 문자열이면 제목을 조판한다 */
  src?: string | null;
  /** 대체 조판에 쓰이고 이미지의 alt 가 된다 */
  title: string;
  /**
   * 주면 대체 조판이 두 줄이 된다 — 제목은 위, 저자는 아래.
   * 표지를 크게 놓는 곳(상세 페이지·격자)에서 빈 상자가 허전하지 않게 한다.
   */
  author?: string | null;
  /**
   * 표지 크기. 다섯 계단(xs~xl)은 높이를 정하고 너비는 판형 비율에서 나온다.
   *
   * - `full` — 컬럼 폭을 채운다(상세 페이지처럼 표지가 한 칸을 차지할 때)
   * - `fill` — 부모가 크기를 정한다. 부모에 `relative` 와 크기가 있어야 한다
   */
  size?: BookCoverSize | 'full' | 'fill';
  /** next/image 의 sizes. 안 주면 size 에서 파생한다 */
  sizes?: string;
  /** 위치·여백 등. 크기는 size 가 정하므로 여기서 덮지 않는 편이 좋다 */
  className?: string;
  /** 장식용 표지라 스크린리더에서 감출 때 (제목이 옆에 이미 있는 경우) */
  decorative?: boolean;
  /** LCP 에 걸리는 큰 표지에만 (next/image 의 priority) */
  priority?: boolean;
};

/**
 * 책 표지 셀 — 이 시스템의 도메인 셰이프를 한 곳에서 책임진다
 *
 * - 왼쪽이 책등이라 각지고 오른쪽만 둥근 비대칭 모서리. Tailwind 로는 표현할 수
 *   없어 `.book-cover` 유틸로 두고, 값은 전부 CSS 변수다(styles/index.css).
 * - 크기는 `size` 계단으로만 정한다. 너비는 판형 비율에서 나온다.
 * - 표지가 없으면 제목을 조판한다. 빈 상자보다 무슨 책인지 아는 편이 낫다.
 */
export const BookCover = ({
  src,
  title,
  author,
  size = 'sm',
  sizes,
  className,
  decorative,
  priority,
}: BookCoverProps) => {
  // className 은 shape 에 섞지 않고 각 분기의 **맨 뒤**로 넘긴다.
  // 여기서 합쳐 두면 뒤따라오는 기본 클래스(`text-xs` 등)가 호출부 지정을
  // 이겨 버린다 — twMerge 는 나중에 온 것을 남기기 때문이다.
  const shape = coverVariants({ size });

  if (size === 'fill' || size === 'full') {
    // fill: 부모가 크기를 정한다(부모에 relative + 크기 필요).
    // full: 컬럼 폭을 채우고 높이는 aspect-ratio 가 만든다.
    return src ? (
      <Image
        src={src}
        alt={decorative ? '' : title}
        aria-hidden={decorative || undefined}
        {...(size === 'fill'
          ? { fill: true }
          : // full 은 레이아웃이 폭을 정하므로 고유 크기를 알 수 없다.
            // 판형 비율에 맞는 임의의 큰 값을 힌트로 주고 실제 크기는 CSS 가 정한다.
            { width: 400, height: 580 })}
        sizes={sizes}
        priority={priority}
        className={cn(shape, 'object-cover', size === 'full' && 'h-auto', className)}
      />
    ) : (
      <FallbackCover
        shape={shape}
        title={title}
        author={author}
        decorative={decorative}
        className={className}
      />
    );
  }

  const height = coverSizes[size];
  // 판형 비율(20/29)에서 너비를 얻는다. CSS 의 aspect-ratio 와 같은 값이라
  // 둘이 어긋날 일은 없지만, next/image 는 렌더 전에 숫자를 요구하므로
  // 여기서도 한 번 계산한다.
  const width = Math.round((height * 20) / 29);

  // 지정이 없으면 실제 렌더 폭을 그대로 알려준다. 이걸 빼면 next/image 가
  // 화면 폭 기준으로 과하게 큰 이미지를 받아온다.
  const resolvedSizes = sizes ?? `${width}px`;

  if (src) {
    return (
      <Image
        src={src}
        alt={decorative ? '' : title}
        aria-hidden={decorative || undefined}
        width={width}
        height={height}
        sizes={resolvedSizes}
        priority={priority}
        // 높이 계단이 정한 상자를 이미지가 채운다. 판형이 다른 책이 섞여도
        // 목록의 표지 폭이 흔들리지 않는다.
        className={cn(shape, 'object-cover', className)}
        style={{ height }}
      />
    );
  }

  return (
    <FallbackCover
      shape={shape}
      title={title}
      author={author}
      decorative={decorative}
      height={height}
      width={width}
      className={className}
    />
  );
};

type FallbackCoverProps = {
  shape: string;
  title: string;
  author?: string | null;
  decorative?: boolean;
  height?: number;
  width?: number;
  className?: string;
};

/**
 * 표지 이미지가 없는 책 — 제목(과 저자)을 조판해 표지를 만든다.
 *
 * 이미지와 **같은 상자**를 쓴다. 예전에는 대체 조판만 비율이 없어서
 * `fallbackClassName` 이라는 별도 prop 으로 기하를 따로 넘겨야 했는데,
 * 크기를 size 계단이 정하게 되면서 그 prop 이 필요 없어졌다.
 */
const FallbackCover = ({
  shape,
  title,
  author,
  decorative,
  height,
  width,
  className,
}: FallbackCoverProps) => {
  return (
    <span
      aria-hidden={decorative || undefined}
      // 너비를 함께 못 박는다. aspect-ratio 만으로는 부족하다 —
      // 콘텐츠의 최소 너비가 비율보다 우선하기 때문에, 작은 계단(xs)에서
      // 제목 글자가 상자를 옆으로 밀어 비율이 1.45 대신 1.23 이 됐다.
      // (실측으로 잡았다: 52.2×64 → 44×64)
      style={height ? { height, width } : undefined}
      className={cn(
        shape,
        // 글자가 상자를 넘겨도 비율을 지킨다.
        'overflow-hidden',
        // 대체 표지에도 면과 경계가 보여야 한다. .book-cover 가 @layer
        // components 로 들어가면서 이제 이 유틸들이 실제로 먹는다 —
        // 레이어 밖에 있던 동안에는 적어 두고도 무시됐다.
        'flex border border-line bg-sunken p-2',
        // 저자가 있으면 위아래로 벌려 표지 조판처럼, 없으면 가운데 정렬
        author
          ? 'flex-col justify-between text-left'
          : 'items-center justify-center text-center',
        // 대체 표지는 진짜 표지의 자리를 메우는 것이지 강조 대상이 아니다 —
        // 07 의 weight 3단계 중 400 을 쓴다.
        'text-xs leading-snug text-text-subtle',
        // 호출부 지정이 마지막에 와야 위 기본값들을 덮을 수 있다.
        className
      )}
    >
      <span className='line-clamp-4 break-keep'>{title}</span>
      {author && <span className='line-clamp-1 shrink-0'>{author}</span>}
    </span>
  );
};
