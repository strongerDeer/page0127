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
import { ChevronDown } from 'lucide-react';

import { formatDate } from '@/shared/lib/date';

import {
  badgePresentation,
  badgeProgressLabel,
  badgeProgressPercent,
  isSecretBadge,
} from '../model/badgePresentation';
import { badgeUnit } from '../model/badges';
import { BadgeEvidenceBooks } from './BadgeEvidenceBooks';
import { BadgeMedal } from './BadgeMedal';
import { BadgeStack } from './BadgeStack';

import type { BadgeEvidence } from '../model/badgeEvidence';
import type { Badge } from '../model/badges';

import styles from './BadgeShelf.module.css';

type BadgeTileProps = {
  badge: Badge;
  evidence?: BadgeEvidence;
  size?: number;
  showProgress?: boolean;
  username?: string;
};

/** 목록은 정면에 고정하고, 상세에서 선택한 책의 표지만 펼친다. */
export const BadgeTile = ({
  badge,
  evidence,
  size = 112,
  showProgress = false,
  username,
}: BadgeTileProps) => {
  const [opened, setOpened] = useState(false);
  const { title, hint } = badgePresentation(badge);
  const secret = isSecretBadge(badge);
  const progressLabel = badgeProgressLabel(badge);
  const progress = secret ? null : badge.progress;
  const earnedDate =
    !secret && badge.earned && badge.earnedAt
      ? formatDate(badge.earnedAt)
      : null;

  return (
    <Dialog onOpenChange={() => setOpened(false)}>
      {/* 버튼 이름은 aria-label 대신 안의 글자로 만든다 — aria-label 이 있으면 Lighthouse
          (label-content-name-mismatch)가 배지 그림 속 글자("독서의 순간을 기록해요")까지
          보이는 글자로 세어 이름과 다르다고 잡는다. 이름은 그대로 "제목 (획득/미획득)"이다:
          화면용 힌트·미획득·진행도는 aria-hidden, 상태는 sr-only 로 읽힌다 */}
      <DialogTrigger className={styles.tile}>
        <BadgeStack badge={badge} size={size} />
        <span
          className={`${styles.name} ${badge.earned ? '' : styles.unearned}`}
        >
          {title}
          <span className='sr-only'>
            {` (${badge.earned ? '획득' : '미획득'})`}
          </span>
          {hint && (
            <span
              aria-hidden='true'
              className='mt-1 block text-xs text-text-subtle'
            >
              힌트 · {hint}
            </span>
          )}
          {!badge.earned && (
            <span aria-hidden='true' className={styles.lockedLabel}>
              미획득
            </span>
          )}
        </span>
        {showProgress && progress && (
          <span aria-hidden='true' className={styles.progress}>
            <Progress value={badgeProgressPercent(badge)} className='h-1' />
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
              ? `힌트 · ${hint}. 이름과 정확한 조건은 받기 전까지 비밀이에요.`
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
        {!evidence && opened && badge.earned && (badge.book || earnedDate) && (
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
        {!secret && evidence && (
          <BadgeEvidenceBooks
            key={badge.id}
            evidence={evidence}
            username={username}
          />
        )}
        {!!badge.stages?.length && (
          <details className={`${styles.stageDisclosure} group`}>
            <summary className='flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm font-bold text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary [&::-webkit-details-marker]:hidden'>
              단계별 획득 기록
              <ChevronDown
                className='h-4 w-4 shrink-0 text-text-subtle group-open:rotate-180'
                aria-hidden
              />
            </summary>
            <ol className={styles.stageList} aria-label='성장 단계별 획득 기록'>
              {badge.stages.map((stage) => (
                <li key={stage.value} data-earned={!!stage.earnedAt}>
                  <span>
                    {stage.value.toLocaleString('en-US')}
                    {badgeUnit(badge.id)}
                  </span>
                  <span>
                    {stage.earnedAt
                      ? `${formatDate(stage.earnedAt)} 획득`
                      : '미획득'}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        )}
        {!!badge.stages?.length && badge.earned && !progress && (
          <p className='text-xs text-text-subtle'>이 성장 단계를 달성했어요</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
