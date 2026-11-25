'use client';

import { type PointerEvent, useRef } from 'react';

import { FULL_SHEETS } from '@/entities/typing';

import s from './LittlePrinceCover.module.css';

/**
 * 『어린 왕자』 필사 페이지 표지 — 직접 그린 도트 표지.
 *
 * 원작 표지·삽화·인물은 쓰지 않는다(재단이 상표로 관리). 밤하늘 + 둥근 작은 별 + 장미 한 송이만.
 * 마우스를 따라 기울고, 올려 두면 표지가 열리며 첫 문장이 보이고, 누르면 필사 창으로 내려간다.
 */

// ── 도트 그림 데이터(30 × 42 칸) ──────────────────────────────
// 흰 종이 + 연보라 작은 별 + 노란 별·달 — 누구나 떠올리는 『어린 왕자』의 분위기만 빌린다.
// 인물(어린 왕자)·원작 그림의 모양은 그리지 않는다.
type Px = [x: number, y: number, w: number, h: number, fill: string];

const PAPER = '#fbf8f1';
const STAR = '#f2c94c';

/** 노란 별(십자 모양 5칸) — twinkle 은 천천히 깜빡인다 */
const STARS: { x: number; y: number; big: boolean; twinkle: boolean }[] = [
  { x: 25, y: 13, big: true, twinkle: true },
  { x: 4, y: 26, big: true, twinkle: false },
  { x: 4, y: 36, big: true, twinkle: true },
  { x: 12, y: 15, big: false, twinkle: true },
  { x: 27, y: 19, big: false, twinkle: false },
  { x: 10, y: 20, big: false, twinkle: true },
  { x: 2, y: 31, big: false, twinkle: false },
];

/** 둥근 달 두 개 */
const MOONS: Px[] = [
  [4, 17, 2, 1, STAR],
  [3, 18, 4, 2, STAR],
  [4, 20, 2, 1, STAR],
  [20, 15, 2, 2, STAR],
];

/** 연보라 작은 별(행성) — 원을 칸으로 깎고, 왼쪽 위는 밝게·오른쪽 아래는 어둡게 */
const PLANET: Px[] = (() => {
  const cx = 18;
  const cy = 31;
  const r = 9;
  const rows: Px[] = [];
  for (let y = Math.ceil(cy - r); y < cy + r; y++) {
    const dy = y + 0.5 - cy;
    const half = Math.sqrt(Math.max(r * r - dy * dy, 0));
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half);
    if (x1 <= x0) continue;
    rows.push([x0, y, x1 - x0, 1, '#b8b0cc']);
    if (dy < 0) {
      const light = Math.max(Math.round(half * 0.5), 1);
      rows.push([x0, y, light, 1, '#cbc4dc']);
    } else {
      const shade = Math.max(Math.round(half * 0.5), 1);
      rows.push([x1 - shade, y, shade, 1, '#a39abb']);
    }
  }
  return rows;
})();

const DETAILS: Px[] = [
  // 작은 화산 두 개(왼쪽·오른쪽 위)
  [11, 24, 3, 1, '#8e86a6'],
  [12, 23, 1, 1, '#8e86a6'],
  [23, 23, 3, 1, '#8e86a6'],
  [24, 22, 1, 1, '#8e86a6'],
  // 꽃 두 송이
  [16, 21, 1, 1, '#4f9a5b'],
  [16, 20, 1, 1, '#d6505f'],
  [20, 21, 1, 1, '#4f9a5b'],
  [20, 20, 1, 1, '#d6505f'],
  // 별 표면의 자국
  [17, 29, 2, 1, '#8e86a6'],
  [20, 34, 2, 1, '#8e86a6'],
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
              <rect width={30} height={42} fill={PAPER} />
              {[...MOONS, ...PLANET, ...DETAILS].map(
                ([x, y, w, h, fill], i) => (
                  <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
                )
              )}
              {STARS.map(({ x, y, big, twinkle }) => (
                <g
                  key={`${x}-${y}`}
                  className={twinkle ? s.twinkle : undefined}
                  fill={STAR}
                >
                  {big ? (
                    <>
                      <rect x={x} y={y - 1} width={1} height={3} />
                      <rect x={x - 1} y={y} width={3} height={1} />
                    </>
                  ) : (
                    <rect x={x} y={y} width={1} height={1} />
                  )}
                </g>
              ))}
            </svg>
            <span className={s.title}>
              <span className={s.titleMain}>어린 왕자</span>
              <span className={s.titleSub}>앙투안 드 생텍쥐페리</span>
            </span>
          </span>
        </span>
      </button>
      <p className={s.hint} aria-hidden>
        표지를 누르면 바로 필사를 시작해요
      </p>
    </div>
  );
};
