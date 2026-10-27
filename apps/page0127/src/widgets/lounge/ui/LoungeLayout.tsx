'use client';
import { useId, useState } from 'react';

import { SegmentedControl, SegmentedControlItem } from '@repo/ui';

import type { KeyboardEvent, ReactNode } from 'react';

import styles from './LoungeLayout.module.css';

/** 모바일만 탭으로 나누고, PC에서는 두 영역을 동시에 보여준다. */
export const LoungeLayout = ({
  feed,
  battle,
}: {
  feed: ReactNode;
  battle: ReactNode;
}) => {
  const [tab, setTab] = useState<'feed' | 'battle'>('feed');
  const id = useId();
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 'feed'
        : event.key === 'End'
          ? 'battle'
          : tab === 'feed'
            ? 'battle'
            : 'feed';
    setTab(next);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)
      ?.focus();
  };
  return (
    <>
      <SegmentedControl
        className={styles.mobileTabs}
        role='tablist'
        aria-label='라운지 보기'
      >
        {(['feed', 'battle'] as const).map((value) => (
          <SegmentedControlItem
            type='button'
            key={value}
            data-tab={value}
            role='tab'
            id={`${id}-${value}-tab`}
            aria-controls={`${id}-${value}`}
            aria-selected={tab === value}
            tabIndex={tab === value ? 0 : -1}
            onKeyDown={onKeyDown}
            onClick={() => setTab(value)}
          >
            {value === 'battle' && (
              <span className={styles.tabVs} aria-hidden='true'>
                VS
              </span>
            )}
            {value === 'feed' ? '피드' : '배틀'}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <div className={styles.layout}>
        <section
          role='tabpanel'
          id={`${id}-feed`}
          aria-labelledby={`${id}-feed-tab`}
          tabIndex={0}
          data-active={tab === 'feed'}
          className={styles.feed}
        >
          {feed}
        </section>
        <section
          role='tabpanel'
          id={`${id}-battle`}
          aria-labelledby={`${id}-battle-tab`}
          tabIndex={0}
          data-active={tab === 'battle'}
          className={styles.battle}
        >
          {battle}
        </section>
      </div>
    </>
  );
};
