import type { ReactNode } from 'react';

import styles from './LoungeLayout.module.css';

/** 모바일에는 배틀 요약을 먼저 두고, PC에서는 읽는 피드 옆에 배틀을 유지한다. */
export const LoungeLayout = ({
  feed,
  battle,
}: {
  feed: ReactNode;
  battle: ReactNode;
}) => (
  <div className={styles.layout}>
    <section aria-label='피드' className={styles.feed}>
      {feed}
    </section>
    <aside aria-label='배틀' className={styles.battle}>
      {battle}
    </aside>
  </div>
);
