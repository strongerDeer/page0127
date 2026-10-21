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

/** 뱃지 → 합성 이미지 경로 */
export const badgeImageSrc = (badge: Badge) => {
  if (badge.kind === 'hidden' && !badge.earned)
    return '/badges/seal-locked.webp';
  if (badge.id === 'shelf') return `/badges/shelf-${levelValue(badge)}.webp`;
  if (badge.id === 'wide-view') return `/badges/wide-${levelValue(badge)}.webp`;
  return `/badges/${badge.id}.webp`;
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
            className={`${styles.level} absolute inset-x-0 bottom-[17%] text-center font-extrabold leading-none`}
            style={{ fontSize: size * 0.24 }}
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
