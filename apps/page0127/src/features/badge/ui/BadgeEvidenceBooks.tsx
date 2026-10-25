'use client';

import { useState } from 'react';

import Link from 'next/link';

import { Button } from '@repo/ui';

import { formatDate } from '@/shared/lib/date';

import type { BadgeEvidence } from '../model/badgeEvidence';

import styles from './BadgeShelf.module.css';

const PAGE_SIZE = 20;

export const BadgeEvidenceBooks = ({
  evidence,
  username,
}: {
  evidence: BadgeEvidence;
  username?: string;
}) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { books, milestone } = evidence;
  const remaining = books.length - visibleCount;
  return (
    <section className={styles.evidence} aria-label='배지 집계 근거'>
      <h3 className='text-sm font-bold text-text-strong'>
        {evidence.title} · {books.length}
        {evidence.unit}
      </h3>
      {milestone && (
        <p className='mt-1 text-xs leading-relaxed text-text-subtle'>
          1~{milestone.count}번 기록이 {milestone.label} 달성에 포함됐어요.
        </p>
      )}
      <ol className={styles.evidenceList} aria-label={evidence.title}>
        {books.slice(0, visibleCount).map((book, index) => (
          <li key={book.id}>
            <span className={styles.evidenceNumber} aria-hidden>
              {index + 1}
            </span>
            <div className='min-w-0 flex-1'>
              {book.detail && (
                <p className='mb-0.5 text-xs font-medium text-primary'>
                  {book.detail}
                </p>
              )}
              <p className='break-words text-sm font-medium text-text-strong'>
                {username ? (
                  <Link prefetch={false} href={`/${username}/${book.id}`}>
                    {book.title}
                  </Link>
                ) : (
                  book.title
                )}
              </p>
              {book.author && (
                <p className='mt-0.5 break-words text-xs text-text-subtle'>
                  {book.author}
                </p>
              )}
              <p className='mt-1 text-xs text-text-subtle'>
                {book.completedAt
                  ? `${formatDate(book.completedAt)} 완독`
                  : '완독일 미기록'}
              </p>
              {milestone?.count === index + 1 && (
                <p className='mt-1 text-xs font-semibold text-primary'>
                  {milestone.label} 달성
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {remaining > 0 && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='mt-3 w-full'
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          {Math.min(PAGE_SIZE, remaining)}
          {evidence.unit} 더 보기 · {visibleCount} / {books.length}
        </Button>
      )}
    </section>
  );
};
