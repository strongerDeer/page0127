'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Progress,
} from '@repo/ui';

import { formatDate } from '@/shared/lib/date';

import { BadgeMedal } from './BadgeMedal';

import type { Badge } from '../model/badges';

/** 히든 뱃지는 받기 전까지 이름·조건·그림을 숨긴다 */
export const isSecret = (badge: Badge) =>
  badge.kind === 'hidden' && !badge.earned;

const earnedLine = (badge: Badge) => {
  if (!badge.earnedAt) return null;
  const date = formatDate(badge.earnedAt);
  return badge.book
    ? `『${badge.book.title}』로 받았어요 · ${date}`
    : `${date}에 받았어요`;
};

const progressPercent = ({
  current,
  target,
}: {
  current: number;
  target: number;
}) => Math.min(100, (current / target) * 100);

type BadgeTileProps = {
  badge: Badge;
  /** 반짝임이 한꺼번에 지나가지 않도록 칸마다 엇갈리는 순번 */
  index: number;
  /** 메달 너비(px) */
  size?: number;
  /** 이름 아래에 진행 막대까지 (상세 페이지) */
  showProgress?: boolean;
};

/**
 * 뱃지 한 칸. 누르면 크게 뒤집히며 나타나는 상세 창이 열린다.
 * 상세 창은 닫히면 내용이 사라지므로(Radix 기본) 열 때마다 등장 연출이 다시 돈다.
 */
export const BadgeTile = ({
  badge,
  index,
  size = 54,
  showProgress = false,
}: BadgeTileProps) => {
  const secret = isSecret(badge);
  const name = secret ? '???' : badge.name;
  const levelLabel =
    badge.kind === 'growth' && badge.level > 0 ? `Lv.${badge.level}` : null;
  const line = earnedLine(badge);
  const progress = !secret ? badge.progress : null;

  return (
    <Dialog>
      <DialogTrigger
        className='group flex w-full flex-col items-center gap-1.5 rounded-xl p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring'
        aria-label={`${name}${badge.earned ? ' (받음)' : ' (아직 못 받음)'}`}
      >
        <BadgeMedal
          badge={badge}
          shineDelay={(index % 7) * 0.7}
          size={size}
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
        {showProgress && progress && (
          <span className='w-full max-w-20 space-y-0.5'>
            <Progress
              value={progressPercent(progress)}
              className='h-1'
              aria-hidden
            />
            <span className='block text-[10px] leading-none text-text-subtle'>
              {progress.current}/{progress.target}
            </span>
          </span>
        )}
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
        {progress && (
          <div className='space-y-1 text-left'>
            <Progress
              value={progressPercent(progress)}
              aria-label='다음 단계까지 진행도'
            />
            <p className='text-right text-xs text-text-subtle'>
              {progress.current} / {progress.target}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
