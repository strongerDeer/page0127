'use client';

import Image from 'next/image';

import { badgeCoverArt } from '../model/badgeCoverArt';
import { badgeLevelColor, badgePresentation } from '../model/badgePresentation';

import type { Badge } from '../model/badges';
import type { CSSProperties } from 'react';

import styles from './BadgeMedal.module.css';

type BadgeMedalProps = {
  badge: Badge;
  size: number;
  className?: string;
  view?: 'cover' | 'spine';
  opened?: boolean;
  reveal?: boolean;
  preview?: boolean;
};

/** 표지 아트의 실제 타이포·회화·사진을 보존하고, 제본과 펼치기만 CSS로 만든다. */
export const BadgeMedal = ({
  badge,
  size,
  className,
  view = 'cover',
  opened = false,
  reveal = false,
  preview = false,
}: BadgeMedalProps) => {
  const { title, cover, levelValue } = badgePresentation(badge);
  const art = badgeCoverArt(cover);
  const color = badgeLevelColor(badge.id, badge.level);
  return (
    <div
      aria-hidden='true'
      data-badge-book
      data-growth={color ? true : undefined}
      data-cover={cover}
      data-preview={preview || undefined}
      data-view={view}
      data-locked={!badge.earned || undefined}
      data-open={(opened && badge.earned) || undefined}
      className={`${styles.book} ${reveal ? styles.reveal : ''} ${className ?? ''}`}
      style={
        {
          '--book-width': `${size}px`,
          '--jacket-paper': color?.paper ?? art.paper,
          '--level-paper': color?.paper,
          '--level-ink': color?.ink,
          '--level-edge': color?.edge,
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
            className={`${styles.volume} ${cover !== 'shelf' ? styles.fieldVolume : ''}`}
          >
            {levelValue.toLocaleString('en-US')}
          </span>
        )}
        {!badge.earned && (
          <span className={styles.emptyState}>
            <span>{badge.kind === 'hidden' ? '?' : '+'}</span>미획득
          </span>
        )}
        <span className={styles.spineTitle}>{title}</span>
      </div>
    </div>
  );
};
