'use client';

import { useMemo } from 'react';

import { computeBadges } from '../model/badges';
import { BadgeTile } from './BadgeTile';

import type { Badge, BadgeInput, BadgeKind } from '../model/badges';

const SECTIONS: { kind: BadgeKind; title: string; hint: string }[] = [
  { kind: 'growth', title: '성장', hint: '읽을수록 단계가 올라가요' },
  { kind: 'story', title: '이야기', hint: '독서 습관이 남긴 순간들' },
  { kind: 'hidden', title: '히든', hint: '조건은 받기 전까지 비밀이에요' },
];

type BadgeCollectionProps = BadgeInput & {
  /** 주인은 못 받은 뱃지(히든은 ???)까지, 방문자는 받은 것만 본다 */
  isOwner: boolean;
};

/**
 * 뱃지 상세 페이지 본문 — 성장·이야기·히든으로 나눠 전부 보여 준다.
 * 방문자에게 잠긴 뱃지를 보여 주면 "못 한 것 목록"이 되므로 받은 것만 보인다.
 */
export const BadgeCollection = ({
  isOwner,
  books,
  readingGoal,
  firstTasteAnalysisAt,
}: BadgeCollectionProps) => {
  const badges = useMemo(
    () => computeBadges({ books, readingGoal, firstTasteAnalysisAt }),
    [books, readingGoal, firstTasteAnalysisAt]
  );
  const earnedCount = badges.filter((badge) => badge.earned).length;

  const sections = SECTIONS.map((section) => ({
    ...section,
    badges: badges
      .filter((badge) => badge.kind === section.kind)
      .filter((badge) => isOwner || badge.earned)
      // 받은 것 먼저, 그 안에서는 정의 순서
      .map((badge, order) => ({ badge, order }))
      .sort(
        (a, b) =>
          Number(b.badge.earned) - Number(a.badge.earned) || a.order - b.order
      )
      .map(({ badge }) => badge),
  })).filter((section) => section.badges.length > 0);

  if (sections.length === 0) {
    return (
      <p className='rounded-2xl border border-line-soft bg-card p-8 text-center text-sm text-text-subtle'>
        아직 받은 뱃지가 없어요
      </p>
    );
  }

  // 반짝임 순번 — 칸마다 엇갈리도록 섹션을 이어서 센다
  const sectionStart = sections.map((_, i) =>
    sections.slice(0, i).reduce((sum, s) => sum + s.badges.length, 0)
  );

  return (
    <div className='space-y-6'>
      <p className='text-sm text-text-subtle'>
        {isOwner
          ? `${badges.length}개 중 ${earnedCount}개를 받았어요`
          : `${earnedCount}개를 받았어요`}
      </p>
      {sections.map((section, sectionIndex) => (
        <section
          key={section.kind}
          aria-labelledby={`badge-section-${section.kind}`}
          className='rounded-2xl border border-line-soft bg-card p-6 sm:p-8'
        >
          <div className='flex items-baseline gap-2'>
            <h3
              id={`badge-section-${section.kind}`}
              className='text-base font-bold text-text-strong'
            >
              {section.title}
            </h3>
            <span className='text-xs text-text-subtle'>{section.hint}</span>
          </div>
          <ul className='mt-5 grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-5 lg:grid-cols-7'>
            {section.badges.map((badge: Badge, i) => (
              <li key={badge.id}>
                <BadgeTile
                  badge={badge}
                  index={sectionStart[sectionIndex] + i}
                  size={72}
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
