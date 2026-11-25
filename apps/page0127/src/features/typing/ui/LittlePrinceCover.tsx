'use client';

import { type PointerEvent, useRef } from 'react';

import { FULL_SHEETS } from '@/entities/typing';

import s from './LittlePrinceCover.module.css';

/**
 * 『어린 왕자』 필사본 표지 — page0127.이 그린 도트 표지.
 *
 * 원작 표지·삽화·인물은 쓰지 않는다(재단이 상표로 관리). 밤하늘 + 둥근 작은 별 + 장미 한 송이만.
 * 마우스를 따라 기울고, 올려 두면 표지가 열리며 첫 문장이 보이고, 누르면 필사 창으로 내려간다.
 */

// ── 도트 그림 데이터(30 × 42 칸) ──────────────────────────────
type Px = [x: number, y: number, w: number, h: number, fill: string];

const SKY: Px[] = [
  [0, 0, 30, 14, '#1b2452'],
  [0, 14, 30, 10, '#212c62'],
  [0, 24, 30, 10, '#283574'],
  [0, 34, 30, 8, '#2f3d82'],
];

/** 반짝이는 별(twinkle)과 가만히 있는 별 */
const STARS: { x: number; y: number; twinkle: boolean }[] = [
  { x: 3, y: 13, twinkle: true },
  { x: 25, y: 12, twinkle: false },
  { x: 6, y: 19, twinkle: false },
  { x: 22, y: 17, twinkle: true },
  { x: 27, y: 22, twinkle: false },
  { x: 2, y: 26, twinkle: true },
  { x: 11, y: 15, twinkle: false },
  { x: 21, y: 9, twinkle: true },
  { x: 26, y: 30, twinkle: true },
  { x: 4, y: 33, twinkle: false },
];

/** 둥근 작은 별(행성) — 원을 칸으로 깎는다. 한 번만 계산해 두는 모듈 상수 */
const PLANET: Px[] = (() => {
  const cx = 15;
  const cy = 29;
  const r = 7;
  const rows: Px[] = [];
  for (let y = Math.ceil(cy - r); y < cy + r; y++) {
    const dy = y + 0.5 - cy;
    const half = Math.sqrt(Math.max(r * r - dy * dy, 0));
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half);
    if (x1 <= x0) continue;
    rows.push([x0, y, x1 - x0, 1, '#e9b872']);
    // 오른쪽 아래 그늘
    if (dy > -2) {
      const shade = Math.max(Math.round(half * 0.45), 1);
      rows.push([x1 - shade, y, shade, 1, '#c98f4f']);
    }
  }
  return rows;
})();

const DETAILS: Px[] = [
  // 분화구
  [11, 30, 2, 1, '#d29a5a'],
  [17, 33, 2, 1, '#b97f43'],
  // 작은 화산(왼쪽 위)
  [10, 23, 3, 1, '#8a5a3a'],
  [11, 22, 1, 1, '#8a5a3a'],
  [11, 21, 1, 1, '#f08a4b'],
  // 장미 줄기·잎·꽃
  [17, 19, 1, 3, '#4c9a5a'],
  [18, 20, 1, 1, '#4c9a5a'],
  [16, 17, 3, 2, '#d9485f'],
  [17, 16, 1, 1, '#ef7186'],
  // 별똥별
  [22, 27, 1, 1, '#fff4d6'],
  [23, 26, 1, 1, '#c9d2f5'],
  [24, 25, 1, 1, '#8f9bd6'],
];

/** 표지를 열면 보이는 첫 문장 — 본문 첫 쪽에서 그대로 가져온다(번역을 고쳐도 어긋나지 않게) */
const FIRST_LINE = `${FULL_SHEETS[0].text.split('. ')[0]}.`;

export const LittlePrinceCover = ({
  targetId = 'typing-room',
}: {
  targetId?: string;
}) => {
  const bookRef = useRef<HTMLSpanElement>(null);

  // 마우스 위치 → 기울기(최대 ±10도). 상태로 두지 않고 CSS 변수만 바꿔서 리렌더가 없다.
  const tilt = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || !bookRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    bookRef.current.style.setProperty('--ry', `${(px * 20).toFixed(1)}deg`);
    bookRef.current.style.setProperty('--rx', `${(-py * 14).toFixed(1)}deg`);
  };
  const reset = () => {
    bookRef.current?.style.setProperty('--ry', '0deg');
    bookRef.current?.style.setProperty('--rx', '0deg');
  };

  const open = () => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    target.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
    // 스크롤이 끝난 뒤 종이를 눌러 둔 것처럼 바로 칠 수 있게
    window.setTimeout(
      () => target.querySelector('textarea')?.focus({ preventScroll: true }),
      reduce ? 0 : 450
    );
  };

  return (
    <div className='flex flex-col items-center'>
      <button
        type='button'
        className={s.stage}
        onPointerMove={tilt}
        onPointerLeave={reset}
        onClick={open}
        aria-label='『어린 왕자』 필사 시작하기 — 필사 창으로 이동'
      >
        <span ref={bookRef} className={s.book}>
          <span className={s.inner} aria-hidden>
            <span className={s.innerLabel}>1장 1쪽</span>
            {FIRST_LINE}
          </span>
          <span className={s.edge} aria-hidden />
          <span className={s.cover} aria-hidden>
            <svg
              className={s.art}
              viewBox='0 0 30 42'
              preserveAspectRatio='none'
              shapeRendering='crispEdges'
            >
              {[...SKY, ...PLANET, ...DETAILS].map(([x, y, w, h, fill], i) => (
                <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
              ))}
              {STARS.map(({ x, y, twinkle }) => (
                <rect
                  key={`${x}-${y}`}
                  className={twinkle ? s.twinkle : undefined}
                  x={x}
                  y={y}
                  width={1}
                  height={1}
                  fill='#ffe08a'
                />
              ))}
            </svg>
            <span className={s.title}>
              <span className={s.titleMain}>어린 왕자</span>
              <span className={s.titleSub}>앙투안 드 생텍쥐페리</span>
            </span>
            <span className={s.badge}>page0127. 필사본</span>
          </span>
        </span>
      </button>
      <p className={s.hint} aria-hidden>
        표지를 누르면 바로 필사를 시작해요
      </p>
    </div>
  );
};
