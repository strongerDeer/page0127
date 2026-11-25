'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { SegmentedControl, SegmentedControlItem, Switch } from '@repo/ui';

import { setTypingRankOptInAction } from '../api/typingActions';
import { rankLines } from '../model/rankRows';

import type { TypingBoard, TypingRankRow } from '@/entities/typing';

const BOARDS: {
  key: TypingBoard;
  label: string;
  unit: string;
  note: string;
}[] = [
  {
    key: 'steady',
    label: '꾸준함',
    unit: '쪽',
    note: '이번 주(월요일 0시부터) 끝까지 쓴 쪽 수예요. 같은 쪽은 한 주에 한 번만 세요.',
  },
  {
    key: 'speed',
    label: '타수',
    unit: '타',
    note: '정확도 95% 이상으로 끝까지 쓴 쪽의 최고 평균 타수예요.',
  },
];

/**
 * 필사 랭킹 — 탭 두 개(꾸준함·타수, HJ 2026-11-25 "둘 다").
 * 순위에는 참여를 켠 사람만 닉네임으로 나온다. 기본은 꺼짐.
 */
export const TypingRankingCard = ({
  memberId,
  rankOptIn,
  rankings,
  loginHref,
}: {
  memberId: string | null;
  rankOptIn: boolean;
  rankings: Record<TypingBoard, TypingRankRow[]>;
  loginHref: string;
}) => {
  const router = useRouter();
  const [board, setBoard] = useState<TypingBoard>('steady');
  const [optIn, setOptIn] = useState(rankOptIn);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const current = BOARDS.find((b) => b.key === board)!;
  const lines = rankLines(rankings[board], memberId);

  const toggle = (next: boolean) => {
    setOptIn(next);
    setError(null);
    startTransition(async () => {
      const res = await setTypingRankOptInAction(next);
      if (!res.ok) {
        setOptIn(!next);
        setError(res.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className='flex flex-col gap-4 rounded-2xl border border-line-soft bg-card p-5 sm:p-6'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='text-lg font-bold text-text-strong'>필사 랭킹</h2>
        <SegmentedControl aria-label='랭킹 기준'>
          {BOARDS.map((b) => (
            <SegmentedControlItem
              key={b.key}
              aria-pressed={board === b.key}
              onClick={() => setBoard(b.key)}
            >
              {b.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      {lines.length === 0 ? (
        <p className='rounded-xl bg-sunken px-4 py-6 text-center text-sm text-text-subtle'>
          아직 순위에 오른 사람이 없어요. 첫 번째가 되어 보세요!
        </p>
      ) : (
        <ol className='flex flex-col'>
          {lines.map((line, i) =>
            line.type === 'gap' ? (
              <li
                key={`gap-${i}`}
                aria-hidden
                className='py-1 text-center text-text-subtle'
              >
                ⋯
              </li>
            ) : (
              <li
                key={line.row.userId}
                className={`grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  line.isMe ? 'bg-accent font-bold text-text-strong' : ''
                }`}
              >
                <span
                  className={`font-bold tabular-nums ${
                    line.rank <= 3 ? 'text-primary' : 'text-text-subtle'
                  }`}
                >
                  {line.rank}
                </span>
                <span className='truncate text-text-body'>
                  {line.row.nickname}
                  {line.isMe && ' (나)'}
                </span>
                <span className='font-bold tabular-nums text-text-strong'>
                  {line.row.value.toLocaleString()}
                  {current.unit}
                </span>
              </li>
            )
          )}
        </ol>
      )}
      <p className='text-xs text-text-subtle'>{current.note}</p>

      <div className='border-t border-line-soft pt-4'>
        {memberId ? (
          <div className='flex items-center justify-between gap-3'>
            <div>
              <p className='text-sm font-bold text-text-strong'>
                내 닉네임으로 순위에 참여
              </p>
              <p className='text-xs text-text-subtle'>
                끄면 기록은 나만 보고, 순위에는 나오지 않아요.
              </p>
            </div>
            <Switch
              aria-label='내 닉네임으로 순위에 참여'
              checked={optIn}
              disabled={isPending}
              onCheckedChange={toggle}
            />
          </div>
        ) : (
          <p className='text-sm text-text-subtle'>
            <Link
              href={loginHref}
              className='font-bold text-primary underline-offset-4 hover:underline'
            >
              로그인
            </Link>
            하면 내 기록이 쌓이고 순위에도 참여할 수 있어요.
          </p>
        )}
        {error && (
          <p role='alert' className='mt-2 text-sm text-text-body'>
            {error}
          </p>
        )}
      </div>
    </section>
  );
};
