'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import { ChevronRight } from 'lucide-react';

import { computeBadges } from '../model/badges';
import { BadgeTile } from './BadgeTile';

import type { BadgeInput } from '../model/badges';

import styles from './BadgeShelf.module.css';

type BadgeSummaryProps = BadgeInput & { username: string; isOwner: boolean };

/** 서재에서는 최근 받은 표지를 3권(모바일)·5권(데스크톱)까지 선반에 놓는다. */
export const BadgeSummary = ({
  username,
  isOwner,
  books,
  readingGoal,
  firstTasteAnalysisAt,
}: BadgeSummaryProps) => {
  const badges = useMemo(
    () => computeBadges({ books, readingGoal, firstTasteAnalysisAt }),
    [books, readingGoal, firstTasteAnalysisAt]
  );
  const earned = badges
    .filter((badge) => badge.earned)
    .sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''));
  if (!earned.length && !isOwner) return null;

  return (
    <section
      aria-labelledby='badge-summary-title'
      className='rounded-2xl border border-line-soft bg-card px-5 py-5 sm:px-6'
    >
      <div className='flex items-center justify-between gap-2'>
        <h3
          id='badge-summary-title'
          className='text-sm font-bold text-text-strong'
        >
          배지 책장{' '}
          <span className='ml-1 font-medium text-text-subtle'>
            {isOwner ? `${earned.length} / ${badges.length}` : earned.length}
          </span>
        </h3>
        <Link
          href={`/${username}/badges`}
          className='inline-flex items-center gap-0.5 text-xs text-text-subtle hover:text-text-strong'
        >
          전체 보기
          <ChevronRight className='size-3.5' aria-hidden />
        </Link>
      </div>
      {earned.length ? (
        <ul className={styles.summaryShelf}>
          {earned.slice(0, 5).map((badge) => (
            <li key={badge.id} className={styles.shelfItem}>
              <BadgeTile badge={badge} username={username} size={64} />
            </li>
          ))}
        </ul>
      ) : (
        <p className='mt-3 text-xs text-text-subtle'>
          첫 완독을 기록하면 작은 책 한 권이 꽂혀요
        </p>
      )}
    </section>
  );
};
