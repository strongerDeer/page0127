import { BadgeMedal } from './BadgeMedal';

import type { Badge } from '../model/badges';
import type { CSSProperties } from 'react';

import styles from './BadgeShelf.module.css';

/** 최고 단계 앞에, 이전 달성 단계 두 권만 포개어 같은 계열임을 보여준다. */
export const BadgeStack = ({ badge, size }: { badge: Badge; size: number }) => {
  const previous = (badge.stages ?? [])
    .map((stage, index) => ({ ...stage, level: index + 1 }))
    .filter((stage) => stage.earnedAt && stage.level < badge.level)
    .slice(-2);
  return (
    <span
      className={styles.stack}
      data-badge-stack={previous.length || undefined}
      style={{ '--stack-width': `${size}px` } as CSSProperties}
    >
      {previous.map((stage, index) => (
        <span
          key={stage.value}
          aria-hidden
          className={styles.stackBack}
          style={{ '--stack-offset': previous.length - index } as CSSProperties}
        >
          <BadgeMedal badge={{ ...badge, level: stage.level }} size={size} />
        </span>
      ))}
      <span className={styles.stackFront}>
        <BadgeMedal badge={badge} size={size} />
      </span>
    </span>
  );
};
