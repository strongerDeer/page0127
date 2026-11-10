'use client';

import { useRef, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@repo/ui';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { formatSentenceSource } from '@/entities/daily-sentence';

import { formatDrawDay } from '../model/drawMonths';

import type { DailySentence } from '@/entities/daily-sentence';

import styles from './SentencePage.module.css';

type DailySentenceReaderProps = {
  /** 넘기는 순서 그대로(최신 → 과거) */
  draws: DailySentence[];
  /** 펼친 페이지 위치. null 이면 닫힘 */
  index: number | null;
  onIndexChange: (index: number | null) => void;
};

type TurnDirection = 'next' | 'prev' | null;

/** 이만큼 옆으로 밀면 한 장 넘긴다(px) — 세로 스크롤·탭과 헷갈리지 않을 만큼 */
const SWIPE_THRESHOLD = 48;

/**
 * 오늘의 문장 리더 — 책장 넘기듯 한 장씩 (HJ, 2026-11-10).
 *
 * 넘기는 방법 셋: ‹ › 버튼, 좌우 스와이프, 좌우 방향키.
 * 넘길 때 article 의 key 를 바꿔 새로 그리고, 방향에 맞는 넘김 애니메이션을 한 번 건다
 * (모션 줄이기 설정이면 CSS 가 애니메이션을 끈다).
 *
 * 순서는 그리드와 같다 — 왼쪽 위(최신)부터 읽어 내려가듯 "다음 장"이 하루 전이다.
 */
export const DailySentenceReader = ({
  draws,
  index,
  onIndexChange,
}: DailySentenceReaderProps) => {
  const [direction, setDirection] = useState<TurnDirection>(null);
  const swipeStartX = useRef<number | null>(null);

  const draw = index === null ? null : draws[index];
  const hasPrev = index !== null && index > 0;
  const hasNext = index !== null && index < draws.length - 1;

  const turn = (to: 'next' | 'prev') => {
    if (index === null) return;
    if (to === 'next' && !hasNext) return;
    if (to === 'prev' && !hasPrev) return;
    setDirection(to);
    onIndexChange(to === 'next' ? index + 1 : index - 1);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    setDirection(null);
    onIndexChange(null);
  };

  const turnClass =
    direction === 'next'
      ? styles.turnNext
      : direction === 'prev'
        ? styles.turnPrev
        : '';

  return (
    <Dialog open={draw != null} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        // 설명 문단이 따로 없다 — 제목(날짜)과 본문 문장으로 충분하다
        aria-describedby={undefined}
        className='w-[calc(100%-2rem)] max-w-sm gap-5 border-0 bg-transparent p-0 shadow-none outline-none sm:max-w-sm'
        // 열자마자 닫기 버튼에 포커스 링이 뜨지 않게 창 자체에 포커스 — 방향키는 그대로 받는다
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') turn('next');
          if (event.key === 'ArrowLeft') turn('prev');
        }}
        onPointerDown={(event) => {
          swipeStartX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (swipeStartX.current === null) return;
          const dx = event.clientX - swipeStartX.current;
          swipeStartX.current = null;
          // 왼쪽으로 밀면 다음 장 — 종이책을 넘기는 손 방향
          if (dx <= -SWIPE_THRESHOLD) turn('next');
          if (dx >= SWIPE_THRESHOLD) turn('prev');
        }}
      >
        {draw && (
          <>
            <article
              key={draw.draw_date}
              className={`${styles.paper} ${turnClass} flex min-h-[26rem] touch-pan-y select-none flex-col gap-7 px-7 pb-5 pl-8 pt-5`}
            >
              <header className='flex items-center justify-between'>
                <DialogTitle asChild>
                  <h2 className={`${styles.meta} text-xs font-normal`}>
                    {draw.draw_date.slice(0, 4)}년{' '}
                    {formatDrawDay(draw.draw_date)}에 펼친 문장
                  </h2>
                </DialogTitle>
                <button
                  type='button'
                  onClick={() => handleOpenChange(false)}
                  aria-label='닫기'
                  className={`${styles.meta} -mr-3 inline-flex size-11 items-center justify-center rounded-full hover:bg-black/5`}
                >
                  <X className='size-5' aria-hidden />
                </button>
              </header>

              <blockquote
                className={`${styles.serif} flex-1 whitespace-pre-wrap break-keep text-lg leading-loose`}
              >
                {draw.text}
              </blockquote>

              <p className={`${styles.meta} text-xs`}>
                {formatSentenceSource(draw)}
              </p>
            </article>

            <nav
              aria-label='페이지 넘기기'
              className='flex items-center justify-between'
            >
              <button
                type='button'
                onClick={() => turn('prev')}
                disabled={!hasPrev}
                aria-label='이전 장'
                className='inline-flex size-11 items-center justify-center rounded-full bg-background text-text-strong shadow-sm hover:bg-accent disabled:opacity-40'
              >
                <ChevronLeft className='size-5' aria-hidden />
              </button>
              <span
                className='rounded-full bg-background px-3 py-1 text-sm tabular-nums text-text-strong shadow-sm'
                aria-live='polite'
              >
                {(index ?? 0) + 1} / {draws.length}
              </span>
              <button
                type='button'
                onClick={() => turn('next')}
                disabled={!hasNext}
                aria-label='다음 장'
                className='inline-flex size-11 items-center justify-center rounded-full bg-background text-text-strong shadow-sm hover:bg-accent disabled:opacity-40'
              >
                <ChevronRight className='size-5' aria-hidden />
              </button>
            </nav>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
