'use client';

import { badgePresentation } from '../model/badgePresentation';

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
};

/** 같은 제본에 서로 다른 인쇄 표지. 목록은 정면, 상세에서 표지만 열린다. */
export const BadgeMedal = ({
  badge,
  size,
  className,
  view = 'cover',
  opened = false,
  reveal = false,
}: BadgeMedalProps) => {
  const { title, cover, lines, levelValue } = badgePresentation(badge);
  const literary = [
    'author-fan',
    'finally',
    'life-book',
    'new-year',
    'thin-but-deep',
    'worn-out',
  ].includes(cover);
  return (
    <div
      aria-hidden='true'
      data-badge-book
      data-cover={cover}
      data-view={view}
      data-locked={!badge.earned || undefined}
      data-open={(opened && badge.earned) || undefined}
      className={`${styles.book} ${reveal ? styles.reveal : ''} ${className ?? ''}`}
      style={{ '--book-width': `${size}px` } as CSSProperties}
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
        <span className={styles.art}>
          <span />
          <span />
          <span />
        </span>
        {cover === 'author-fan' && <span className={styles.signature} />}
        {cover === 'critic' && <span className={styles.quotation}>“</span>}
        <span className={`${styles.title} ${literary ? styles.literary : ''}`}>
          {lines.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </span>
        {levelValue !== null && (
          <span className={styles.volume}>{levelValue}</span>
        )}
        <span className={styles.grain} />
        <span className={styles.imprint}>page0127</span>
        <span className={styles.ribbon} />
        <span className={styles.spineTitle}>{title}</span>
      </div>
    </div>
  );
};
