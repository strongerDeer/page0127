'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Progress,
} from '@repo/ui';

import { formatDate } from '@/shared/lib/date';

import {
  badgePresentation,
  badgeProgressLabel,
  badgeProgressPercent,
  isSecretBadge,
} from '../model/badgePresentation';
import { BadgeMedal } from './BadgeMedal';

import type { Badge } from '../model/badges';

import styles from './BadgeShelf.module.css';

type BadgeTileProps = {
  badge: Badge;
  size?: number;
  showProgress?: boolean;
  username?: string;
};

/** 목록은 정면에 고정하고, 상세에서 선택한 책의 표지만 펼친다. */
export const BadgeTile = ({
  badge,
  size = 112,
  showProgress = false,
  username,
}: BadgeTileProps) => {
  const [opened, setOpened] = useState(false);
  const { title } = badgePresentation(badge);
  const secret = isSecretBadge(badge);
  const progressLabel = badgeProgressLabel(badge);
  const progress = secret ? null : badge.progress;
  const earnedDate =
    !secret && badge.earned && badge.earnedAt
      ? formatDate(badge.earnedAt)
      : null;

  return (
    <Dialog onOpenChange={() => setOpened(false)}>
      <DialogTrigger
        className={styles.tile}
        aria-label={`${title} (${badge.earned ? '획득' : '미획득'})`}
      >
        <BadgeMedal badge={badge} size={size} />
        <span
          className={`${styles.name} ${badge.earned ? '' : styles.unearned}`}
        >
          {title}
          {!badge.earned && <span className={styles.lockedLabel}>미획득</span>}
        </span>
        {showProgress && progress && (
          <span className={styles.progress}>
            <Progress
              value={badgeProgressPercent(badge)}
              className='h-1'
              aria-hidden
            />
            <span className={styles.progressText}>{progressLabel}</span>
          </span>
        )}
      </DialogTrigger>
      <DialogContent className='max-h-[90dvh] max-w-sm overflow-y-auto break-keep text-center'>
        <div className={styles.detailStage}>
          <BadgeMedal
            badge={badge}
            size={192}
            opened={opened}
            reveal={badge.earned}
            preview={!badge.earned}
          />
        </div>
        <div>
          <p className='mb-1 text-xs text-text-subtle'>
            {badge.earned ? '책장에 모은 이야기' : '아직 만나지 않은 이야기'}
          </p>
          <DialogTitle className='text-xl font-bold text-text-strong'>
            {title}
          </DialogTitle>
          <DialogDescription className='mt-2 text-sm text-text-body'>
            {secret
              ? '읽다 보면 뜻밖에 만나게 될 책이에요. 이름과 조건은 받기 전까지 비밀이에요.'
              : badge.description}
          </DialogDescription>
        </div>
        {badge.earned && (
          <Button
            variant='outline'
            className='mx-auto'
            aria-pressed={opened}
            onClick={() => setOpened(!opened)}
          >
            {opened ? '책장에 꽂기' : '책 펼쳐보기'}
          </Button>
        )}
        {opened && badge.earned && (badge.book || earnedDate) && (
          <div className={styles.record}>
            <p className='mb-1 text-xs text-text-subtle'>이 배지를 만든 기록</p>
            {badge.book && (
              <p className='text-sm font-medium text-text-strong'>
                {username ? (
                  <Link
                    // 목록 링크는 미리 불러오지 않는다 (Vercel CPU — 00_docs 남은 작업 참고)
                    prefetch={false}
                    href={`/${username}/${badge.book.id}`}
                  >
                    {badge.book.title}
                  </Link>
                ) : (
                  badge.book.title
                )}
              </p>
            )}
            {earnedDate && (
              <p className='mt-1 text-xs text-text-subtle'>
                {earnedDate}에 받았어요
              </p>
            )}
          </div>
        )}
        {progress && (
          <div className='space-y-2 text-left'>
            <p className='text-xs text-text-subtle'>
              {badge.earned ? '다음 이야기까지' : '첫 이야기까지'}
            </p>
            <Progress
              value={badgeProgressPercent(badge)}
              aria-label='다음 배지까지 진행도'
            />
            <p className='text-right text-xs text-text-subtle'>
              {progressLabel}
            </p>
          </div>
        )}
        {badge.kind === 'growth' && badge.earned && !progress && (
          <p className='text-xs text-text-subtle'>이 성장 단계를 달성했어요</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
