'use client';

import { type ReactNode, useRef } from 'react';

import { useNearViewport } from '@/shared/lib/hooks/useNearViewport';

import styles from './BookListItem.module.css';

/**
 * 첫 화면 밖 표지는 화면 가까이(300px) 와서야 그린다.
 *
 * 그 전에는 표지 자리만 잡아 두는 빈 종이(.coverPlaceholder)를 둔다. 높이는 슬롯이
 * 정하고 폭은 보통 판형(1:1.45)으로 잡아, 표지가 뜰 때 아래 글자가 밀리지 않는다.
 * 서버 HTML 에도 빈 종이로 나가므로 첫 로드에 이 표지들은 아예 요청되지 않는다.
 */
export const DeferredCover = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const near = useNearViewport(ref);

  if (near) return <>{children}</>;
  return (
    <span
      ref={ref}
      data-cover-placeholder=''
      aria-hidden='true'
      className={styles.coverPlaceholder}
    />
  );
};
