'use client';

import { useState } from 'react';

import { Star } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { RATING_NUDGE_MAX_BOOKS, type UnratedBook } from '../model/ratingNudge';
import { QuickRatingDialog } from './QuickRatingDialog';

import type { RatingNudge } from '../model/ratingNudge';

type RatingNudgeCardProps = {
  nudge: RatingNudge;
  /** 별점 없는 완독 책 — 최근에 담은 순서 */
  books: UnratedBook[];
  /** 별점을 저장한 뒤 — 서재가 router.refresh 로 숫자를 다시 그린다 */
  onSaved: () => void;
};

/**
 * 서재 주인에게만, 취향 분석이 잠겨 있고 별점만 남기면 되는 책이 있을 때만 보인다(toRatingNudge).
 * 배너·토스트 대신 서재 안의 카드인 이유: 필요한 사람에게 필요한 동안만 보이고,
 * 5권이 채워지면 저절로 사라진다.
 */
export const RatingNudgeCard = ({
  nudge,
  books,
  onSaved,
}: RatingNudgeCardProps) => {
  const [open, setOpen] = useState(false);
  const shown = books.slice(0, RATING_NUDGE_MAX_BOOKS);

  return (
    <>
      <button
        type='button'
        onClick={() => {
          trackEvent('cta_click', {
            location: 'rating_nudge',
            label: '별점 남기기',
          });
          setOpen(true);
        }}
        className='flex w-full flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-card px-5 py-4 text-left transition hover:border-primary/50 hover:shadow-sm'
      >
        <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-chart-6'>
          <Star aria-hidden className='size-5 fill-current' />
        </span>
        <span className='min-w-0 flex-1 basis-[calc(100%-3.5rem)] break-keep sm:basis-0'>
          <span className='block font-semibold text-text-strong'>
            별점만 남기면 취향 분석을 볼 수 있어요
          </span>
          <span className='block text-sm text-text-subtle'>
            별점 없는 완독 책 {nudge.unratedCount}권 · 취향 분석까지{' '}
            {nudge.needed}권 남았어요
          </span>
        </span>
        {/* 모바일은 문구가 좁아지지 않게 버튼을 아래 줄 전체 폭으로 내린다 */}
        <span className='w-full shrink-0 rounded-xl bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground sm:w-auto'>
          별점 남기기
        </span>
      </button>
      <QuickRatingDialog
        open={open}
        onOpenChange={setOpen}
        books={shown}
        needed={nudge.needed}
        onSaved={onSaved}
      />
    </>
  );
};
