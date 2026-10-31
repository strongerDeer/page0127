'use client';

import { useMemo } from 'react';

import { getBadgeEvidence } from '../model/badgeEvidence';
import { computeBadges } from '../model/badges';
import { BadgeTile } from './BadgeTile';

import type { BadgeInput, BadgeKind } from '../model/badges';

import styles from './BadgeShelf.module.css';

const SECTIONS: { kind: BadgeKind; title: string; hint: string }[] = [
  { kind: 'growth', title: '성장', hint: '읽을수록 깊어지는 기록' },
  { kind: 'category', title: '깊이 읽기', hint: '좋아하는 분야에 쌓이는 깊이' },
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
  activity,
}: BadgeCollectionProps) => {
  const badges = useMemo(
    () => computeBadges({ books, readingGoal, firstTasteAnalysisAt, activity }),
    [books, readingGoal, firstTasteAnalysisAt, activity]
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
            ? `전체 ${badges.length}종 중 ${earnedCount}종 획득`
            : `배지 ${earnedCount}종 획득`}
        </p>
      </div>
      {/* 점선(받지 않은 배지)은 주인에게만 보인다 — 방문자 화면엔 점선이 없으니 설명도 뺀다 */}
      {isOwner && (
        <p className='text-xs text-text-subtle'>
          점선은 아직 받지 않은 배지예요. 올리거나 선택하면 표지를 미리 볼 수
          있어요.
        </p>
      )}
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
          <ul className={styles.shelf}>
            {section.badges.map((badge) => (
              <li
                key={`${badge.id}-${badge.level}`}
                className={styles.shelfItem}
              >
                <BadgeTile
                  evidence={getBadgeEvidence(badge, { books, readingGoal })}
                  badge={badge}
                  username={username}
                  size={112}
                  showProgress
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
