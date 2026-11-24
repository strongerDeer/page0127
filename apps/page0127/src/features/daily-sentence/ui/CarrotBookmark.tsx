import Link from 'next/link';

import styles from './CarrotBookmark.module.css';

type CarrotBookmarkProps = {
  /** 말풍선 문구 — 홈 표지 기본은 "오늘의 문장 뽑기!" */
  label?: string;
  className?: string;
};

/**
 * 책장 사이에 꽂힌 당근 책갈피 — 오늘의 문장 입구 (HJ 2026-11-24 "뽑기니까 당근")
 *
 * 서버 컴포넌트. 그냥 /sentence 로 가는 링크다 — 사이트 안에서 누르면 @modal/(.)sentence 가 가로채 모달로,
 * 새 탭·새로고침이면 전체 페이지로 열린다. scroll={false}: 모달이 뜰 때 뒤 화면이 맨 위로 튀지 않게.
 *
 * 그림은 평면 SVG 하나(시안 v10 확정): 둥근 알약 잎 세 장이 꼭지에 틈 없이 붙고, 몸통은 끝이 뭉툭한 당근색,
 * 광은 어깨의 흰 곡선 한 줄, 홈은 위로 볼록한 곡선 세 줄. 부모(.book 등)의 위쪽 모서리에 절대 위치로 꽂힌다.
 */
export const CarrotBookmark = ({
  label = '오늘의 문장 뽑기!',
  className,
}: CarrotBookmarkProps) => (
  <Link
    href='/sentence'
    scroll={false}
    className={`${styles.carrot} ${className ?? ''}`}
    aria-label='오늘의 문장 뽑기'
  >
    <span aria-hidden='true' className={styles.bubble}>
      {label}
    </span>
    <svg aria-hidden='true' viewBox='0 0 60 98' className={styles.svg}>
      <rect
        x='11'
        y='11'
        width='18'
        height='29'
        rx='9'
        transform='rotate(-12 20 38)'
        fill='#2f8f4e'
      />
      <rect
        x='31'
        y='11'
        width='18'
        height='29'
        rx='9'
        transform='rotate(12 40 38)'
        fill='#2f8f4e'
      />
      <rect x='21' y='5' width='18' height='35' rx='9' fill='#38a05a' />
      <path
        d='M30 30 C49 30 57 38 57 51 C57 68 46 82 38 89 C34 92.5 26 92.5 22 89 C14 82 3 68 3 51 C3 38 11 30 30 30 Z'
        fill='#f2862b'
      />
      <path
        d='M14 41 C16 37.5 19 35.5 23 35'
        stroke='#fff'
        strokeWidth='2.6'
        fill='none'
        strokeLinecap='round'
        opacity='.4'
      />
      {/* 홈 — 진한 선 + 바로 아래 밝은 선으로 살짝 파인 느낌(입체 효과 없이) */}
      {GROOVES.map(([x1, x2, y]) => (
        <g key={y}>
          <path
            d={`M${x1} ${y} Q${(x1 + x2) / 2} ${y - 2} ${x2} ${y}`}
            stroke='#d2600d'
            strokeWidth='1.8'
            fill='none'
            strokeLinecap='round'
            opacity='.75'
          />
          <path
            d={`M${x1 + 0.5} ${y + 1.6} Q${(x1 + x2) / 2} ${y - 0.4} ${x2 - 0.5} ${y + 1.6}`}
            stroke='#ffb06a'
            strokeWidth='1.1'
            fill='none'
            strokeLinecap='round'
            opacity='.7'
          />
        </g>
      ))}
    </svg>
  </Link>
);

/** [시작 x, 끝 x, y] — 오른쪽 어깨 · 왼쪽 몸통 · 오른쪽 아래 */
const GROOVES: ReadonlyArray<readonly [number, number, number]> = [
  [30, 45, 45],
  [14, 28, 63],
  [27, 38, 79],
];
