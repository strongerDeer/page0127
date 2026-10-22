'use client';

import { useRef } from 'react';

import Image from 'next/image';

import { SHELF_LEVELS, WIDE_VIEW_LEVELS } from '../model/badges';

import type { Badge } from '../model/badges';
import type { CSSProperties, PointerEvent } from 'react';

import styles from './BadgeMedal.module.css';

/**
 * 뱃지 그림.
 *
 * 그림은 `scripts/build-badge-assets.mjs` 가 "같은 틀 + 뱃지별 안쪽 그림"으로 합성한
 * public/badges/*.webp 다 (모든 뱃지가 600×800, 틀 모양·크기·기울기가 같다).
 * 여기서는 그 위에 코드로만 그릴 수 있는 것을 얹는다.
 * - 성장 단계 숫자 (앱 글꼴)
 * - 잠긴 히든의 물음표
 * - 잠김 흑백, 반짝임, 기울기, 등장 연출
 */

const levelValue = (badge: Badge) => {
  const levels = badge.id === 'shelf' ? SHELF_LEVELS : WIDE_VIEW_LEVELS;
  // 받은 단계의 기준값, 못 받았으면 첫 기준값
  return levels[Math.max(0, badge.level - 1)] ?? levels[0];
};

/** 그림이 아직 없는 뱃지가 쓰는 빈 뱃지 */
const BLANK_SRC = '/badges/blank.webp';

/**
 * 합성을 마친 그림 — public/badges/<이름>.webp 가 있는 것만.
 * 그림이 하루 10장씩 나와서 나머지는 빈 뱃지로 둔다. 합성하면 여기에 이름을 더한다.
 */
const READY_ASSETS = new Set([
  'shelf-1',
  'shelf-10',
  'shelf-50',
  'shelf-100',
  'shelf-200',
  'wide-3',
  'wide-5',
]);

/** 뱃지 → 합성 그림 이름 (성장은 단계별 그림) */
const assetName = (badge: Badge) => {
  if (badge.kind === 'hidden' && !badge.earned) return 'seal-locked';
  if (badge.id === 'shelf') return `shelf-${levelValue(badge)}`;
  if (badge.id === 'wide-view') return `wide-${levelValue(badge)}`;
  return badge.id;
};

/** 뱃지 → 이미지 경로. 그림이 아직 없으면 빈 뱃지 */
export const badgeImageSrc = (badge: Badge) => {
  const name = assetName(badge);
  return READY_ASSETS.has(name) ? `/badges/${name}.webp` : BLANK_SRC;
};

type BadgeMedalProps = {
  badge: Badge;
  className?: string;
  /** 표시 너비(px) — 숫자·물음표 글자 크기도 이 값에 맞춘다 */
  size: number;
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
  size,
  tiltable = false,
  reveal = false,
  shineDelay = 0,
}: BadgeMedalProps) => {
  const tiltRef = useRef<HTMLDivElement>(null);

  const locked = !badge.earned;
  const secret = badge.kind === 'hidden' && locked;
  const src = badgeImageSrc(badge);
  const blank = src === BLANK_SRC;

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

  return (
    <div
      className={`${styles.medal} ${locked ? styles.locked : ''} aspect-[3/4] ${className ?? ''}`}
      style={{ width: size }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div
        ref={tiltRef}
        className={`${styles.tilt} ${reveal ? styles.reveal : ''} relative h-full w-full`}
      >
        <Image
          src={src}
          alt=''
          width={600}
          height={800}
          // 합성 단계에서 이미 WebP 로 줄여 둔 로컬 파일 — 변환 한도를 쓰지 않는다
          unoptimized
          className={`${styles.art} h-full w-full`}
          draggable={false}
        />

        {badge.kind === 'growth' && (
          <span
            className={`${styles.level} absolute inset-x-0 text-center font-extrabold leading-none ${
              // 빈 뱃지일 땐 가운데, 그림이 들어가면 그림을 가리지 않게 아래로
              blank ? 'top-1/2 -translate-y-1/2' : 'bottom-[17%]'
            }`}
            style={{ fontSize: size * (blank ? 0.3 : 0.24) }}
          >
            {levelValue(badge)}
          </span>
        )}

        {secret && (
          <span
            className={`${styles.secret} absolute inset-0 flex items-center justify-center font-extrabold`}
            style={{ fontSize: size * 0.4 }}
          >
            ?
          </span>
        )}

        {/* 빛 띠 — 뱃지 모양 그대로 오려서 받은 뱃지 위로만 지나간다 */}
        {!locked && (
          <span
            aria-hidden
            className={`${styles.shine} absolute inset-0`}
            style={
              {
                '--delay': `${shineDelay}s`,
                maskImage: `url(${src})`,
                WebkitMaskImage: `url(${src})`,
              } as CSSProperties
            }
          />
        )}
      </div>
    </div>
  );
};
