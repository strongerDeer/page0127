'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import { ChevronRight } from 'lucide-react';

import { computeBadges } from '../model/badges';
import { BadgeTile } from './BadgeTile';

import type { BadgeInput } from '../model/badges';

import styles from './BadgeShelf.module.css';

type BadgeSummaryProps = BadgeInput & { username: string; isOwner: boolean };

/** 받은 모든 단계의 배지를 겹쳐 놓고, 넘치면 가로로 탐색한다. */
export const BadgeSummary = ({
  username,
  isOwner,
  books,
  readingGoal,
  firstTasteAnalysisAt,
}: BadgeSummaryProps) => {
  const badges = useMemo(
    () =>
      computeBadges(
        { books, readingGoal, firstTasteAnalysisAt },
        { includeGrowthSteps: true }
      ),
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
      <p className='mt-2 text-xs text-text-subtle'>
        겹쳐진 배지를 선택해 보세요. 옆으로 넘기면 모두 볼 수 있어요.
      </p>
      {earned.length ? (
        <ul className={styles.summaryShelf} aria-label='획득한 배지 책장'>
          {earned.map((badge) => (
            <li key={`${badge.id}-${badge.level}`} className={styles.shelfItem}>
              <BadgeTile badge={badge} username={username} size={76} />
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
