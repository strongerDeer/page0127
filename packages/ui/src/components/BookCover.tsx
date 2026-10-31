import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/cn';
import { CoverImage } from './CoverImage';

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

/**
 * 표지 슬롯 — 표지가 들어갈 자리. 이미지는 이 안에 원본 판형대로 들어간다.
 *
 * 슬롯은 판형 비율(1:1.45)로 고정한다. 목록에서 판형이 다른 책이 섞여도 글 칸의
 * 시작선이 흔들리지 않게 하려는 것이다. 다만 이미지를 슬롯에 **맞춰 자르지는 않는다**
 * (`.book-cover-fit` 주석 참고) — 높이는 슬롯과 같게, 너비는 원본 비율대로 가운데 정렬.
 */
const slotVariants = cva('flex items-center justify-center', {
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
      /** 부모가 크기를 정하는 상자 안을 채운다 (부모에 position 필요) */
      fill: 'absolute inset-0',
    },
  },
  defaultVariants: { size: 'sm' },
});

type BookCoverProps = Omit<VariantProps<typeof slotVariants>, 'size'> & {
  /** 표지 이미지 URL. 없거나 빈 문자열이면 제목을 조판한다 */
  src?: string | null;
  /**
   * src 를 불러오지 못했을 때 대신 쓸 주소. 이것마저 실패하면 제목을 조판한다.
   * 예: src 는 서점 CDN, fallbackSrc 는 우리 Storage 에 둔 사본.
   */
  fallbackSrc?: string | null;
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
  /**
   * 표지를 슬롯에 맞추는 방식.
   *
   * - `contain`(기본) — 원본 판형 그대로 슬롯 안에 세운다. 잘리지 않는다.
   * - `cover` — 슬롯을 꽉 채우고 넘치는 부분을 자른다. 테두리를 두른 부채꼴·
   *   달력 칸처럼 **틀 자체가 그림**인 장식 자리에서만 쓴다.
   */
  fit?: 'contain' | 'cover';
  /** 슬롯의 위치·여백 등. 크기는 size 가 정하므로 여기서 덮지 않는 편이 좋다 */
  className?: string;
  /** 장식용 표지라 스크린리더에서 감출 때 (제목이 옆에 이미 있는 경우) */
  decorative?: boolean;
  /** LCP 에 걸리는 큰 표지에만 (next/image 의 priority) */
  priority?: boolean;
  /**
   * 상세처럼 표지 한 장을 크게 놓는 자리. YES24 의 가장 큰 사본(XL, ~250KB)까지
   * 허용한다. 목록·격자에서 켜면 고밀도 화면에서 표지마다 XL 을 받는다.
   */
  large?: boolean;
  /**
   * CSS 폭 128px 이하로 작게 놓는 자리. 고밀도 화면에서도 YES24 M(151px)만 받는다.
   * srcset 계단이 128 다음 256 이라, 이걸 안 주면 2x·3x 화면에서 L(275px)을 고른다.
   * large 와 함께 주면 large 가 이긴다.
   */
  small?: boolean;
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
  fallbackSrc,
  title,
  author,
  size = 'sm',
  sizes,
  fit = 'contain',
  className,
  decorative,
  priority,
  large = false,
  small = false,
}: BookCoverProps) => {
  const slot = cn(slotVariants({ size }), className);

  // 계단(xs~xl)은 높이를 못 박고 너비는 판형 비율에서 얻는다. CSS 의 aspect-ratio 와
  // 같은 값이지만 인라인으로도 적는다 — 슬롯 크기가 확정돼야 안쪽 이미지의
  // max-height: 100% 가 풀리고, next/image 도 렌더 전에 숫자를 요구한다.
  const height = size in coverSizes ? coverSizes[size as BookCoverSize] : null;
  const width = height ? Math.round((height * 20) / 29) : null;

  // 지정이 없으면 실제 렌더 폭을 그대로 알려준다. 이걸 빼면 next/image 가
  // 화면 폭 기준으로 과하게 큰 이미지를 받아온다.
  // full·fill 은 레이아웃이 폭을 정하므로 호출부가 sizes 를 주는 편이 좋다.
  const resolvedSizes = sizes ?? (width ? `${width}px` : '200px');

  // 상세·결과처럼 표지를 크게 놓는 자리는 대체 조판 글자도 키운다
  const bigType = large || size === 'lg' || size === 'xl' || size === 'full';

  return (
    <span
      className={slot}
      style={height && width ? { height, width } : undefined}
      aria-hidden={decorative || undefined}
    >
      {/* 최적화 경로와 실패 시 대체는 CoverImage 가 정한다 — 이 컴포넌트가 앱 25곳에서
          쓰이는데, 그중 한 곳이라도 빠지면 그 화면만 조용히 한도를 태운다. */}
      <CoverImage
        src={src}
        fallbackSrc={fallbackSrc}
        large={large}
        small={small}
        alt={decorative ? '' : title}
        priority={priority}
        // 로딩 전 자리 잡기용 비율 힌트일 뿐이다. 실제 크기는 슬롯과 원본 판형이 정한다.
        width={width ?? 400}
        height={height ?? 580}
        sizes={resolvedSizes}
        className={cn(
          'book-cover',
          fit === 'cover' ? 'h-full w-full object-cover' : 'book-cover-fit'
        )}
        fallback={
          <FallbackCover title={title} author={author} bigType={bigType} />
        }
      />
    </span>
  );
};

type FallbackCoverProps = {
  title: string;
  author?: string | null;
  bigType?: boolean;
};

/**
 * 표지 이미지가 없는 책 — 제목(과 저자)을 조판해 표지를 만든다.
 *
 * 슬롯을 꽉 채운다. 슬롯이 판형 비율이라 대체 표지도 같은 판형이 된다.
 */
const FallbackCover = ({ title, author, bigType }: FallbackCoverProps) => {
  return (
    <span
      className={cn(
        'book-cover',
        // 슬롯 크기를 넘지 않는다 — 글자가 길어도 상자를 옆으로 밀지 않는다
        // (예전에 xs 계단에서 제목이 상자를 밀어 비율이 1.45 대신 1.23 이 됐다)
        'h-full w-full min-w-0 overflow-hidden',
        // 대체 표지에도 면과 경계가 보여야 한다. 경계는 .book-cover 의 outline 이 맡는다
        'flex bg-sunken',
        // 저자가 있으면 위아래로 벌려 표지 조판처럼, 없으면 가운데 정렬
        author
          ? 'flex-col justify-between text-left'
          : 'items-center justify-center text-center',
        // 대체 표지는 진짜 표지의 자리를 메우는 것이지 강조 대상이 아니다 —
        // 07 의 weight 3단계 중 400 을 쓴다.
        'leading-snug text-text-subtle',
        bigType ? 'px-3 py-4 text-sm' : 'p-2 text-xs'
      )}
    >
      <span className='line-clamp-4 break-keep'>{title}</span>
      {author && <span className='line-clamp-1 shrink-0'>{author}</span>}
    </span>
  );
};
