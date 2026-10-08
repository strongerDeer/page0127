'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@repo/ui';
import { Minus, Plus } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { GOAL_MAX, GOAL_MIN, writePendingShelf } from '../model/pendingShelf';

/** 한 달에 한 권 — 처음 정하는 사람에게 부담 없는 기본값 */
const DEFAULT_GOAL = 12;

/** 0권인 방문자의 다음 행동 — 막다른 길 대신 "오늘부터" 를 준다 */
export const GoalStarter = () => {
  const router = useRouter();
  const [target, setTarget] = useState(DEFAULT_GOAL);
  const year = new Date().getFullYear();

  const change = (delta: number) =>
    setTarget((t) => Math.min(GOAL_MAX, Math.max(GOAL_MIN, t + delta)));

  const handleSave = () => {
    trackEvent('shelf_preview_goal', { target });
    writePendingShelf({ books: [], goal: { year, target } });
    router.push('/login');
  };

  return (
    <div>
      <p className='break-keep font-medium text-text-strong'>
        아직 없어도 괜찮아요. 오늘부터 시작해요.
      </p>
      <div className='mt-4 flex items-center gap-3'>
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
      </div>
      <Button size='lg' className='mt-4 px-8' onClick={handleSave}>
        목표 저장하기
      </Button>
    </div>
  );
};
