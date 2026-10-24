'use client';

import Image from 'next/image';

import { badgeCoverArt } from '../model/badgeCoverArt';
import { badgePresentation } from '../model/badgePresentation';

import type { Badge } from '../model/badges';
import type { CSSProperties } from 'react';

import styles from './BadgeMedal.module.css';

type BadgeMedalProps = {
  badge: Badge;
  size: number;
  className?: string;
  opened?: boolean;
  reveal?: boolean;
  preview?: boolean;
};

/** 표지 아트의 실제 타이포·회화·사진을 보존하고, 제본과 펼치기만 CSS로 만든다. */
export const BadgeMedal = ({
  badge,
  size,
  className,
  opened = false,
  reveal = false,
  preview = false,
}: BadgeMedalProps) => {
  const { cover, levelValue } = badgePresentation(badge);
  const art = badgeCoverArt(cover);
  return (
    <div
      aria-hidden='true'
      data-badge-book
      data-cover={cover}
      data-preview={preview || undefined}
      data-locked={!badge.earned || undefined}
      data-open={(opened && badge.earned) || undefined}
      className={`${styles.book} ${reveal ? styles.reveal : ''} ${className ?? ''}`}
      style={
        {
          '--book-width': `${size}px`,
          '--shine-delay': `${(art.row * art.columns + art.column + (art.rows === 4 ? 9 : 0)) * 300 + Math.max(1, badge.level) * 50}ms`,
          '--jacket-paper': art.paper,
          '--jacket-ink': art.ink,
        } as CSSProperties
      }
    >
      <div className={styles.pages}>
        <span className={styles.inside}>
          독서의
          <br />
          순간을
          <br />
          기록해요
        </span>
      </div>
      <div className={styles.cover}>
        <span className={styles.artwork} data-badge-artwork>
          <Image
            src={art.src}
            alt=''
            width={art.width}
            height={art.height}
            sizes={`${size * art.columns}px`}
            quality={85}
            className={styles.atlas}
            draggable={false}
            style={{
              width: `${art.columns * 100}%`,
              height: `${art.rows * 100}%`,
              left: `${-art.column * 100}%`,
              top: `${-art.row * 100}%`,
            }}
          />
        </span>
        {levelValue !== null && (
          <span
            className={`${styles.volume} ${cover === 'wide-view' ? styles.fieldVolume : ''}`}
          >
            {levelValue}
          </span>
        )}
        {!badge.earned && (
          <span className={styles.emptyState}>
            <span>{badge.kind === 'hidden' ? '?' : '+'}</span>미획득
          </span>
        )}
      </div>
    </div>
  );
};
