'use client';

import { useMemo } from 'react';

import { Popover, PopoverContent, PopoverTrigger, Progress } from '@repo/ui';
import {
  BookMarked,
  CalendarHeart,
  CircleHelp,
  Compass,
  CopyCheck,
  Dumbbell,
  Feather,
  Fingerprint,
  Flame,
  Gem,
  Hourglass,
  Library,
  MessageSquareQuote,
  PartyPopper,
  Rocket,
  RotateCcw,
  Scale,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

import { formatDate } from '@/shared/lib/date';

import { computeBadges } from '../model/badges';

import type { Badge, BadgeId, BadgeInput, BadgeKind } from '../model/badges';
import type { LucideIcon } from 'lucide-react';

const ICONS: Record<BadgeId, LucideIcon> = {
  shelf: Library,
  'wide-view': Compass,
  'one-sitting': Zap,
  brick: Dumbbell,
  'author-fan': Feather,
  finally: Hourglass,
  reread: RotateCcw,
  'life-book': Sparkles,
  critic: MessageSquareQuote,
  'goal-kept': Target,
  'know-yourself': Fingerprint,
  'day-0127': CalendarHeart,
  'new-year': PartyPopper,
  'double-finish': CopyCheck,
  honest: Scale,
  'thin-but-deep': Gem,
  'new-release': Rocket,
  'book-about-books': BookMarked,
  'worn-out': Flame,
};

/**
 * 받은 뱃지 색 — 종류별로 한 색을 꽉 채운다. 못 받은 건 전부 옅은 회색이라
 * 연한 틴트를 쓰면 받은 것과 못 받은 것이 구분되지 않았다(스크린샷 확인).
 * 아이콘은 배경색(text-background)이라 다크 모드에서도 대비가 뒤집혀 맞는다.
 */
const EARNED_TONE: Record<BadgeKind, string> = {
  growth: 'bg-chart-1 text-background',
  story: 'bg-chart-6 text-background',
  hidden: 'bg-chart-7 text-background',
};

/** 히든 뱃지는 받기 전까지 이름·조건·아이콘을 숨긴다 */
const isSecret = (badge: Badge) => badge.kind === 'hidden' && !badge.earned;

const earnedLine = (badge: Badge) => {
  if (!badge.earnedAt) return null;
  const date = formatDate(badge.earnedAt);
  return badge.book
    ? `『${badge.book.title}』로 받았어요 · ${date}`
    : `${date}에 받았어요`;
};

type BadgeTileProps = { badge: Badge };

const BadgeTile = ({ badge }: BadgeTileProps) => {
  const secret = isSecret(badge);
  const Icon = secret ? CircleHelp : ICONS[badge.id];
  const name = secret ? '???' : badge.name;
  const levelLabel =
    badge.kind === 'growth' && badge.level > 0 ? `Lv.${badge.level}` : null;
  const line = earnedLine(badge);

  return (
    <Popover>
      <PopoverTrigger
        className='group flex w-full flex-col items-center gap-1.5 rounded-xl p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring'
        aria-label={`${name}${badge.earned ? ' (받음)' : ' (아직 못 받음)'}`}
      >
        <span
          className={`relative flex size-12 items-center justify-center rounded-full transition-transform group-hover:scale-105 ${
            badge.earned
              ? EARNED_TONE[badge.kind]
              : 'bg-muted text-text-subtle/60'
          }`}
        >
          <Icon className='size-5' aria-hidden />
          {levelLabel && (
            <span className='absolute -right-1 -bottom-1 rounded-full bg-card px-1 text-[10px] font-bold text-text-strong shadow-sm ring-1 ring-line-soft'>
              {levelLabel}
            </span>
          )}
        </span>
        <span
          className={`line-clamp-2 break-keep text-xs leading-tight ${
            badge.earned ? 'font-medium text-text-strong' : 'text-text-subtle'
          }`}
        >
          {name}
        </span>
      </PopoverTrigger>
      <PopoverContent className='w-64 break-keep text-sm' align='center'>
        <p className='font-bold text-text-strong'>
          {name}
          {levelLabel && (
            <span className='ml-1.5 text-xs font-medium text-text-subtle'>
              {levelLabel}
            </span>
          )}
        </p>
        <p className='mt-1 text-text-body'>
          {secret ? '받기 전까지 조건은 비밀이에요 🤫' : badge.description}
        </p>
        {line && <p className='mt-2 text-xs text-text-subtle'>{line}</p>}
        {badge.progress && !secret && (
          <div className='mt-3 space-y-1'>
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
      </PopoverContent>
    </Popover>
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
      <ul className='mt-5 grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 lg:grid-cols-10'>
        {shown.map((badge) => (
          <li key={badge.id}>
            <BadgeTile badge={badge} />
          </li>
        ))}
      </ul>
    </section>
  );
};
