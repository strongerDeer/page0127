'use client';

import { useMemo, useState } from 'react';

import { computeBadges } from '../model/badges';
import { BadgeTile } from './BadgeTile';

import type { BadgeInput, BadgeKind } from '../model/badges';

import styles from './BadgeShelf.module.css';

const SECTIONS: { kind: BadgeKind; title: string; hint: string }[] = [
  { kind: 'growth', title: '성장', hint: '읽을수록 깊어지는 기록' },
  { kind: 'story', title: '이야기', hint: '독서가 남긴 특별한 순간' },
  { kind: 'hidden', title: '비밀', hint: '뜻밖의 순간에 만나는 책' },
];

type BadgeCollectionProps = BadgeInput & {
  isOwner: boolean;
  username?: string;
};

/** 방문자는 받은 책만, 주인은 비밀 표지를 포함한 전체 책장을 본다. */
export const BadgeCollection = ({
  isOwner,
  username,
  books,
  readingGoal,
  firstTasteAnalysisAt,
}: BadgeCollectionProps) => {
  const [view, setView] = useState<'cover' | 'spine'>('cover');
  const badges = useMemo(
    () => computeBadges({ books, readingGoal, firstTasteAnalysisAt }),
    [books, readingGoal, firstTasteAnalysisAt]
  );
  const earnedCount = badges.filter((badge) => badge.earned).length;
  const sections = SECTIONS.map((section) => ({
    ...section,
    badges: badges.filter(
      (badge) => badge.kind === section.kind && (isOwner || badge.earned)
    ),
  })).filter((section) => section.badges.length > 0);

  if (!sections.length)
    return (
      <p className='rounded-2xl border border-line-soft bg-card p-8 text-center text-sm text-text-subtle'>
        아직 책장에 모은 배지가 없어요
      </p>
    );

  return (
    <div className={styles.collection}>
      <div className={styles.toolbar}>
        <p className='text-sm text-text-subtle'>
          {isOwner
            ? `${badges.length}권의 이야기 중 ${earnedCount}권을 모았어요`
            : `${earnedCount}권의 이야기를 모았어요`}
        </p>
        <div className={styles.switch} role='group' aria-label='배지 보기 방식'>
          <button
            type='button'
            aria-pressed={view === 'cover'}
            onClick={() => setView('cover')}
          >
            표지로 보기
          </button>
          <button
            type='button'
            aria-pressed={view === 'spine'}
            onClick={() => setView('spine')}
          >
            책등으로 보기
          </button>
        </div>
      </div>
      {sections.map((section) => (
        <section
          key={section.kind}
          aria-labelledby={`badge-section-${section.kind}`}
          className={styles.section}
        >
          <div className={styles.heading}>
            <h2
              id={`badge-section-${section.kind}`}
              className='text-base font-bold text-text-strong'
            >
              {section.title}
            </h2>
            <span className='text-xs text-text-subtle'>{section.hint}</span>
          </div>
          <ul
            className={`${styles.shelf} ${view === 'spine' ? styles.spineShelf : ''}`}
          >
            {section.badges.map((badge) => (
              <li key={badge.id} className={styles.shelfItem}>
                <BadgeTile
                  badge={badge}
                  username={username}
                  size={84}
                  showProgress
                  view={view}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
