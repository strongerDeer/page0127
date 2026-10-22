'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import { ChevronRight } from 'lucide-react';

import { computeBadges } from '../model/badges';
import { BadgeTile } from './BadgeTile';

import type { BadgeInput } from '../model/badges';

/** 한 줄에 보이는 최대 개수 — 모바일은 가장 좁은 화면(375px)에서도 잘리지 않게 */
const MAX_SHOWN = 10;
const MAX_SHOWN_MOBILE = 5;
// 넘치는 개수는 머리글의 "받은 수 / 전체"와 전체 보기 링크가 대신 말한다

type BadgeSummaryProps = BadgeInput & {
  username: string;
  /** 주인은 아직 못 받았어도 칸을 보여 주고, 방문자는 받은 게 있을 때만 */
  isOwner: boolean;
};

/**
 * 서재 상단 뱃지 줄 — 최근 받은 뱃지 몇 개와 전체 보기 링크.
 * 전부는 /[username]/badges 상세 페이지에서 본다.
 */
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
  // 최근 받은 것부터 — 받은 날이 같으면 정의 순서(성장 → 이야기 → 히든)
  const earned = badges
    .map((badge, order) => ({ badge, order }))
    .filter(({ badge }) => badge.earned)
    .sort(
      (a, b) =>
        (b.badge.earnedAt ?? '').localeCompare(a.badge.earnedAt ?? '') ||
        a.order - b.order
    )
    .map(({ badge }) => badge);

  if (earned.length === 0 && !isOwner) return null;

  const shown = earned.slice(0, MAX_SHOWN);

  return (
    <section
      aria-labelledby='badge-summary-title'
      className='rounded-2xl border border-line-soft bg-card px-5 py-4 sm:px-6'
    >
      <div className='flex items-center justify-between gap-2'>
        <h3
          id='badge-summary-title'
          className='text-sm font-bold text-text-strong'
        >
          뱃지
          <span className='ml-1.5 font-medium text-text-subtle'>
            {isOwner ? `${earned.length} / ${badges.length}` : earned.length}
          </span>
        </h3>
        <Link
          href={`/${username}/badges`}
          className='flex items-center text-xs text-text-subtle hover:text-text-strong'
        >
          전체 보기
          <ChevronRight className='size-3.5' aria-hidden />
        </Link>
      </div>

      {shown.length > 0 ? (
        <ul className='mt-3 flex items-start gap-1 overflow-x-auto'>
          {shown.map((badge, index) => (
            <li
              key={badge.id}
              className={`w-14 shrink-0 ${index >= MAX_SHOWN_MOBILE ? 'hidden sm:block' : ''}`}
            >
              <BadgeTile badge={badge} index={index} size={40} />
            </li>
          ))}
        </ul>
      ) : (
        <p className='mt-2 text-xs text-text-subtle'>
          첫 완독을 기록하면 첫 뱃지를 받아요 📚
        </p>
      )}
    </section>
  );
};
