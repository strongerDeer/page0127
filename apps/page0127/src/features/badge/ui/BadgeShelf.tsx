'use client';

import { useMemo } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Progress,
} from '@repo/ui';

import { formatDate } from '@/shared/lib/date';

import { computeBadges } from '../model/badges';
import { BadgeMedal } from './BadgeMedal';

import type { Badge, BadgeInput } from '../model/badges';

/** 히든 뱃지는 받기 전까지 이름·조건·그림을 숨긴다 */
const isSecret = (badge: Badge) => badge.kind === 'hidden' && !badge.earned;

const earnedLine = (badge: Badge) => {
  if (!badge.earnedAt) return null;
  const date = formatDate(badge.earnedAt);
  return badge.book
    ? `『${badge.book.title}』로 받았어요 · ${date}`
    : `${date}에 받았어요`;
};

type BadgeTileProps = { badge: Badge; index: number };

/**
 * 뱃지 한 칸. 누르면 크게 뒤집히며 나타나는 상세 창이 열린다.
 * 상세 창은 닫히면 내용이 사라지므로(Radix 기본) 열 때마다 등장 연출이 다시 돈다.
 */
const BadgeTile = ({ badge, index }: BadgeTileProps) => {
  const secret = isSecret(badge);
  const name = secret ? '???' : badge.name;
  const levelLabel =
    badge.kind === 'growth' && badge.level > 0 ? `Lv.${badge.level}` : null;
  const line = earnedLine(badge);

  return (
    <Dialog>
      <DialogTrigger
        className='group flex w-full flex-col items-center gap-1.5 rounded-xl p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring'
        aria-label={`${name}${badge.earned ? ' (받음)' : ' (아직 못 받음)'}`}
      >
        <BadgeMedal
          badge={badge}
          // 반짝임이 한꺼번에 지나가지 않도록 칸마다 엇갈린다
          shineDelay={(index % 7) * 0.7}
          size={54}
          className='transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105'
        />
        <span
          className={`line-clamp-2 break-keep text-xs leading-tight ${
            badge.earned ? 'font-medium text-text-strong' : 'text-text-subtle'
          }`}
        >
          {/* 단계는 표지 숫자가 이미 말한다 — 이름 옆 Lv 는 상세 창에만 */}
          {name}
        </span>
      </DialogTrigger>
      <DialogContent className='max-w-xs break-keep text-center'>
        <BadgeMedal
          badge={badge}
          tiltable
          reveal={badge.earned}
          size={144}
          className='mx-auto mt-2'
        />
        <div>
          <DialogTitle className='text-lg font-bold text-text-strong'>
            {name}
            {levelLabel && (
              <span className='ml-1.5 text-sm font-medium text-text-subtle'>
                {levelLabel}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className='mt-1 text-sm text-text-body'>
            {secret ? '받기 전까지 조건은 비밀이에요 🤫' : badge.description}
          </DialogDescription>
          {line && <p className='mt-3 text-xs text-text-subtle'>{line}</p>}
        </div>
        {badge.progress && !secret && (
          <div className='space-y-1 text-left'>
            <Progress
              value={Math.min(
                100,
                (badge.progress.current / badge.progress.target) * 100
              )}
              aria-label='다음 단계까지 진행도'
            />
            <p className='text-right text-xs text-text-subtle'>
              {badge.progress.current} / {badge.progress.target}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

type BadgeShelfProps = BadgeInput & {
  /** 주인은 못 받은 뱃지(히든은 ???)까지, 방문자는 받은 것만 본다 */
  isOwner: boolean;
};

/**
 * 서재 뱃지 칸.
 * 방문자에게 잠긴 뱃지를 보여 주면 "못 한 것 목록"이 되므로 받은 것만 보인다.
 * 받은 게 하나도 없으면 방문자에게는 칸 자체를 숨긴다.
 */
export const BadgeShelf = ({
  isOwner,
  books,
  readingGoal,
  firstTasteAnalysisAt,
}: BadgeShelfProps) => {
  const badges = useMemo(
    () => computeBadges({ books, readingGoal, firstTasteAnalysisAt }),
    [books, readingGoal, firstTasteAnalysisAt]
  );
  const earnedCount = badges.filter((badge) => badge.earned).length;
  // 받은 것 먼저, 그 안에서는 정의 순서(성장 → 이야기 → 히든)
  const shown = (isOwner ? badges : badges.filter((badge) => badge.earned))
    .map((badge, index) => ({ badge, index }))
    .sort(
      (a, b) =>
        Number(b.badge.earned) - Number(a.badge.earned) || a.index - b.index
    )
    .map(({ badge }) => badge);

  if (shown.length === 0) return null;

  return (
    <section
      aria-labelledby='badge-shelf-title'
      className='rounded-2xl border border-line-soft bg-card p-6 sm:p-8'
    >
      <div className='flex items-baseline justify-between gap-2'>
        <h3
          id='badge-shelf-title'
          className='text-base font-bold text-text-strong'
        >
          뱃지
        </h3>
        <span className='text-xs text-text-subtle'>
          {isOwner ? `${earnedCount} / ${badges.length}` : `${earnedCount}개`}
        </span>
      </div>
      <ul className='mt-5 grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-6 lg:grid-cols-10'>
        {shown.map((badge, index) => (
          <li key={badge.id}>
            <BadgeTile badge={badge} index={index} />
          </li>
        ))}
      </ul>
    </section>
  );
};
