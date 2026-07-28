import { OG_COLORS } from './theme';

/**
 * 공유 카드의 별점 — ⚠️ satori(next/og) 전용
 *
 * 별을 '★' 문자로 찍지 않고 SVG로 그리는 이유:
 * next/og 는 내장 폰트에 없는 글리프를 만나면 Google Fonts 에서 받아오는데, ★(U+2605)는
 * 심볼 폰트(Noto Sans Symbols)를 한 번 더 요청하게 만든다. 그 요청이 실패하면 예외
 * 없이 별만 사라진다(theme.ts 상단 주석 참조). SVG 는 폰트에 의존하지 않는다.
 */

/** 5각별 — viewBox 24x24 기준 */
const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

const STAR_COUNT = 5;

type RatingStarsProps = {
  /** 5점 만점 점수. entities/book 의 toScore() 로 변환해 넘긴다 */
  score: number;
  size?: number;
};

export const RatingStars = ({ score, size = 40 }: RatingStarsProps) => (
  <div style={{ display: 'flex', gap: 6 }}>
    {Array.from({ length: STAR_COUNT }, (_, index) => (
      <svg
        key={index}
        width={size}
        height={size}
        viewBox='0 0 24 24'
        // 빈 별도 자리를 지켜야 "5점 중 3점"이 눈에 들어온다
        fill={index < score ? OG_COLORS.gold : OG_COLORS.paper}
        opacity={index < score ? 1 : 0.22}
      >
        <path d={STAR_PATH} />
      </svg>
    ))}
  </div>
);
