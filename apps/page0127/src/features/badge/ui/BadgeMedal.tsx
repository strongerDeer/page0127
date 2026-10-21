'use client';

import { useId, useRef } from 'react';

import { CircleHelp } from 'lucide-react';

import { SHELF_LEVELS, WIDE_VIEW_LEVELS } from '../model/badges';
import {
  BOOKMARK_PATH,
  BOOKMARK_STITCH_PATH,
  ENAMEL,
  LEVEL_METALS,
  LOCKED_ENAMEL,
  LOCKED_METAL,
  METAL_STOPS,
  SEAL_PATH,
} from './badgeArt';
import { BADGE_ICONS } from './badgeIcons';

import type { Badge } from '../model/badges';
import type { CSSProperties, PointerEvent } from 'react';

import styles from './BadgeMedal.module.css';

/** 책 표지 모양 (viewBox 100×110) */
const COVER = { x: 14, y: 6, width: 66, height: 94, rx: 6 };

/** 가운데에서 퍼지는 햇살 — 레퍼런스의 방사형 배경 */
const RAYS = Array.from({ length: 12 }, (_, i) => {
  const a1 = (Math.PI * 2 * i) / 12;
  const a2 = a1 + Math.PI / 24;
  const at = (a: number) =>
    `${(50 + 90 * Math.cos(a)).toFixed(1)} ${(55 + 90 * Math.sin(a)).toFixed(1)}`;
  return `M50 55L${at(a1)}L${at(a2)}Z`;
}).join('');

/** 성장 뱃지 가운데 숫자 — 받은 단계의 기준값, 못 받았으면 첫 기준값 */
const growthNumber = (badge: Badge) => {
  const levels = badge.id === 'shelf' ? SHELF_LEVELS : WIDE_VIEW_LEVELS;
  return {
    value: levels[Math.max(0, badge.level - 1)] ?? levels[0],
    unit: badge.id === 'shelf' ? '권' : '분야',
  };
};

type BadgeMedalProps = {
  badge: Badge;
  className?: string;
  /** 포인터를 따라 기울기 (상세 화면처럼 크게 보일 때) */
  tiltable?: boolean;
  /** 뒤집히며 등장 */
  reveal?: boolean;
  /** 반짝임이 뱃지마다 엇갈리도록 */
  shineDelay?: number;
};

export const BadgeMedal = ({
  badge,
  className,
  tiltable = false,
  reveal = false,
  shineDelay = 0,
}: BadgeMedalProps) => {
  // useId 의 ':' 는 url(#…) 참조를 깨뜨린다
  const id = useId().replace(/:/g, '');
  const tiltRef = useRef<HTMLDivElement>(null);

  const locked = !badge.earned;
  const secret = badge.kind === 'hidden' && locked;
  const [enamelTop, enamelBottom] = locked ? LOCKED_ENAMEL : ENAMEL[badge.id];
  const metal = locked
    ? LOCKED_METAL
    : METAL_STOPS[
        badge.kind === 'growth'
          ? (LEVEL_METALS[badge.level - 1] ?? 'bronze')
          : 'gold'
      ];
  const ink = locked ? '#a3abb5' : '#ffffff';
  const Icon = secret ? CircleHelp : BADGE_ICONS[badge.id];

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!tiltable || event.pointerType === 'touch') return;
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--ry', `${(x * 28).toFixed(1)}deg`);
    el.style.setProperty('--rx', `${(-y * 28).toFixed(1)}deg`);
  };
  const handleLeave = () => {
    tiltRef.current?.style.removeProperty('--rx');
    tiltRef.current?.style.removeProperty('--ry');
  };

  const shape =
    badge.kind === 'growth' ? (
      <rect {...COVER} />
    ) : badge.kind === 'story' ? (
      <path d={BOOKMARK_PATH} />
    ) : (
      <path d={SEAL_PATH} />
    );

  return (
    <div
      className={`${styles.medal} ${locked ? styles.locked : ''} ${className ?? ''}`}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div
        ref={tiltRef}
        className={`${styles.tilt} ${reveal ? styles.reveal : ''}`}
      >
        <svg
          viewBox='0 0 100 110'
          className='block h-full w-full overflow-visible'
          style={{
            filter: locked
              ? 'drop-shadow(0 1px 1px rgb(0 0 0 / 0.08))'
              : `drop-shadow(0 4px 6px ${enamelBottom}55)`,
          }}
          aria-hidden
        >
          <defs>
            <linearGradient id={`${id}-enamel`} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0' stopColor={enamelTop} />
              <stop offset='1' stopColor={enamelBottom} />
            </linearGradient>
            <linearGradient id={`${id}-metal`} x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0' stopColor={metal[0]} />
              <stop offset='0.45' stopColor={metal[1]} />
              <stop offset='1' stopColor={metal[2]} />
            </linearGradient>
            <radialGradient id={`${id}-wax`} cx='0.35' cy='0.3' r='0.8'>
              <stop offset='0' stopColor={enamelTop} />
              <stop offset='1' stopColor={enamelBottom} />
            </radialGradient>
            <linearGradient id={`${id}-shine`} x1='0' y1='0' x2='1' y2='0'>
              <stop offset='0' stopColor='#fff' stopOpacity='0' />
              <stop offset='0.5' stopColor='#fff' stopOpacity='0.55' />
              <stop offset='1' stopColor='#fff' stopOpacity='0' />
            </linearGradient>
            <clipPath id={`${id}-clip`}>{shape}</clipPath>
          </defs>

          {/* 책 표지 뒤로 보이는 책장(종이) */}
          {badge.kind === 'growth' && (
            <g>
              <rect
                x={COVER.x + 5}
                y={COVER.y + 5}
                width={COVER.width}
                height={COVER.height}
                rx={COVER.rx}
                fill={locked ? '#f4f6f8' : '#fbf6e9'}
                stroke={locked ? '#d5dae0' : '#e4d7b8'}
                strokeWidth='1.5'
              />
              {[0, 1, 2].map((i) => (
                <line
                  key={i}
                  x1={COVER.x + COVER.width + 1.5 + i * 1.2}
                  y1={COVER.y + 9}
                  x2={COVER.x + COVER.width + 1.5 + i * 1.2}
                  y2={COVER.y + COVER.height + 1}
                  stroke={locked ? '#dde1e6' : '#e9dfc6'}
                  strokeWidth='0.6'
                />
              ))}
            </g>
          )}

          {/* 몸통 */}
          <g
            fill={
              badge.kind === 'hidden' ? `url(#${id}-wax)` : `url(#${id}-enamel)`
            }
          >
            {shape}
          </g>

          {/* 안쪽 장식 — 햇살, 책등, 바느질, 봉인 테 */}
          <g clipPath={`url(#${id}-clip)`}>
            <path d={RAYS} fill='#fff' opacity={locked ? 0.35 : 0.12} />
            {badge.kind === 'growth' && (
              <rect
                x={COVER.x}
                y={COVER.y}
                width='12'
                height={COVER.height}
                fill='#000'
                opacity={locked ? 0.05 : 0.18}
              />
            )}
            {/* 위쪽 광택 */}
            <ellipse
              cx='42'
              cy='16'
              rx='46'
              ry='18'
              fill='#fff'
              opacity='0.18'
            />
          </g>
          {badge.kind === 'story' && (
            <path
              d={BOOKMARK_STITCH_PATH}
              fill='none'
              stroke={ink}
              strokeOpacity='0.55'
              strokeWidth='1.2'
              strokeDasharray='3 2.5'
            />
          )}
          {badge.kind === 'hidden' && (
            <circle
              cx='50'
              cy='56'
              r='29'
              fill='none'
              stroke={locked ? '#b8c0c9' : '#7d1410'}
              strokeOpacity='0.7'
              strokeWidth='2.2'
            />
          )}

          {/* 테두리 금속 — 밀랍은 테두리 없이 */}
          {badge.kind !== 'hidden' && (
            <g fill='none' stroke={`url(#${id}-metal)`} strokeWidth='3.2'>
              {shape}
            </g>
          )}
          {badge.kind === 'growth' && (
            <line
              x1={COVER.x + 12}
              y1={COVER.y + 1.5}
              x2={COVER.x + 12}
              y2={COVER.y + COVER.height - 1.5}
              stroke={`url(#${id}-metal)`}
              strokeWidth='1.4'
            />
          )}

          {/* 가운데 기호 */}
          {badge.kind === 'growth' ? (
            <g fill={ink} textAnchor='middle' fontWeight='800'>
              <text
                x='53'
                y='60'
                fontSize={
                  String(growthNumber(badge).value).length > 2 ? 24 : 30
                }
                style={{ paintOrder: 'stroke' }}
                stroke={locked ? 'none' : enamelBottom}
                strokeWidth='2'
              >
                {growthNumber(badge).value}
              </text>
              <text x='53' y='78' fontSize='11' fontWeight='700' opacity='0.9'>
                {growthNumber(badge).unit}
              </text>
            </g>
          ) : (
            <Icon
              x={badge.kind === 'story' ? 33 : 34}
              y={badge.kind === 'story' ? 25 : 40}
              width={badge.kind === 'story' ? 34 : 32}
              height={badge.kind === 'story' ? 34 : 32}
              color={badge.kind === 'hidden' && !locked ? '#ffd877' : ink}
              strokeWidth={2.2}
            />
          )}

          {/* 빛 띠 — 받은 뱃지만 */}
          {!locked && (
            <g clipPath={`url(#${id}-clip)`}>
              <rect
                className={styles.shine}
                style={{ '--delay': `${shineDelay}s` } as CSSProperties}
                x='0'
                y='-10'
                width='26'
                height='130'
                fill={`url(#${id}-shine)`}
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
