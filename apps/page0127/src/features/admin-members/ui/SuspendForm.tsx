'use client';

import { useState, useTransition } from 'react';

import {
  suspendUser,
  unsuspendUser,
} from '@/features/admin-members/api/suspendActions';

import type { SuspendInput } from '@/features/admin-members/lib/suspension';

export const SuspendForm = ({
  userId,
  suspended,
}: {
  userId: string;
  suspended: boolean;
}) => {
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'permanent' | 'days'>('permanent');
  const [days, setDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSuspend = () => {
    if (mode === 'days' && (!Number.isFinite(days) || days < 1)) return;
    const input: SuspendInput =
      mode === 'permanent' ? { kind: 'permanent' } : { kind: 'days', days };
    setError(null);
    // 서버액션이 throw하면(ban/미러/감사 실패) 사용자에게 인라인으로 알린다.
    startTransition(async () => {
      try {
        await suspendUser(userId, input, reason);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : '정지 처리 중 오류가 발생했습니다.'
        );
      }
    });
  };
  const onUnsuspend = () => {
    setError(null);
    startTransition(async () => {
      try {
        await unsuspendUser(userId, reason);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : '해제 처리 중 오류가 발생했습니다.'
        );
      }
    });
  };

  if (suspended) {
    return (
      <div className='rounded border border-line p-4'>
        <div className='mb-2 text-sm font-semibold'>정지 해제</div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder='해제 사유(선택)'
          className='mb-2 w-full rounded border border-line px-3 py-2 text-sm'
        />
        <button
          onClick={onUnsuspend}
          disabled={isPending}
          className='rounded border border-line px-3 py-2 text-sm hover:bg-accent disabled:opacity-50'
        >
          정지 해제
        </button>
        {error && <p className='mt-2 text-sm text-destructive'>{error}</p>}
      </div>
    );
  }

  return (
    <div className='rounded border border-line p-4'>
      <div className='mb-2 text-sm font-semibold'>계정 정지</div>
      <div className='mb-2 flex gap-3 text-sm'>
        <label className='flex items-center gap-1'>
          <input
            type='radio'
            checked={mode === 'permanent'}
            onChange={() => setMode('permanent')}
          />
          영구
        </label>
        <label className='flex items-center gap-1'>
          <input
            type='radio'
            checked={mode === 'days'}
            onChange={() => setMode('days')}
          />
          기간
        </label>
        {mode === 'days' && (
          <input
            type='number'
            min={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className='w-20 rounded border border-line px-2 py-1'
          />
        )}
        {mode === 'days' && <span className='self-center'>일</span>}
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder='정지 사유(권장)'
        className='mb-2 w-full rounded border border-line px-3 py-2 text-sm'
      />
      <button
        onClick={onSuspend}
        disabled={isPending}
        className='rounded border border-line px-3 py-2 text-sm hover:bg-accent disabled:opacity-50'
      >
        정지
      </button>
      {error && <p className='mt-2 text-sm text-destructive'>{error}</p>}
    </div>
  );
};
