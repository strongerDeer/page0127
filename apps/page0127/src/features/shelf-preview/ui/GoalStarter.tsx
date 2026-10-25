'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@repo/ui';
import { Flag, Minus, Plus } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { toPendingLoginPath } from '../model/loginTransfer';
import { GOAL_MAX, GOAL_MIN, writePendingShelf } from '../model/pendingShelf';

/** 한 달에 한 권 — 처음 정하는 사람에게 부담 없는 기본값 */
const DEFAULT_GOAL = 12;

/**
 * 0권인 방문자의 다음 행동. 주 경로(책 고르기)와 다투지 않게 보조(outline) 버튼으로 두고,
 * 누르면 그때 목표 스테퍼를 펼친다.
 * 예전엔 문장 전체가 밑줄 없는 링크라 그냥 안내문처럼 보였다 — 누를 곳을 버튼으로 보여 준다(2026-10-25 HJ).
 */
export const GoalStarter = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(DEFAULT_GOAL);
  const year = new Date().getFullYear();

  const change = (delta: number) =>
    setTarget((t) => Math.min(GOAL_MAX, Math.max(GOAL_MIN, t + delta)));

  const handleSave = () => {
    trackEvent('shelf_preview_goal', { target });
    const pending = { books: [], goal: { year, target } };
    writePendingShelf(pending);
    router.push(toPendingLoginPath(pending));
  };

  return (
    <div>
      <p className='break-keep text-sm font-medium text-text-body md:text-base'>
        아직 읽은 책이 없나요? 올해 목표부터 같이 세워봐요!
      </p>
      <Button
        type='button'
        variant='outline'
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className='mt-3 gap-1.5'
      >
        <Flag aria-hidden='true' className='size-4' />
        {year}년 목표 세우기
      </Button>
      {open && (
        <div className='mt-3 flex flex-wrap items-center gap-3'>
          <span className='text-sm text-text-subtle'>{year}년 목표</span>
          <Button
            type='button'
            variant='outline'
            size='icon-md'
            aria-label='목표 한 권 줄이기'
            disabled={target <= GOAL_MIN}
            onClick={() => change(-1)}
          >
            <Minus aria-hidden='true' className='size-4' />
          </Button>
          <output
            aria-live='polite'
            className='min-w-14 text-center text-lg font-bold text-text-strong'
          >
            {target}권
          </output>
          <Button
            type='button'
            variant='outline'
            size='icon-md'
            aria-label='목표 한 권 늘리기'
            disabled={target >= GOAL_MAX}
            onClick={() => change(1)}
          >
            <Plus aria-hidden='true' className='size-4' />
          </Button>
          <Button type='button' onClick={handleSave}>
            목표 저장하기
          </Button>
        </div>
      )}
    </div>
  );
};
