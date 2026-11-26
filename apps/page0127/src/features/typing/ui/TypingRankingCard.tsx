'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { SegmentedControl, SegmentedControlItem, Switch } from '@repo/ui';

import { FAMOUS_SHEETS, FULL_SHEETS } from '@/entities/typing';

import { setTypingRankOptInAction } from '../api/typingActions';
import { rankLines } from '../model/rankRows';

import type { TypingBoard, TypingRankRow } from '@/entities/typing';

/** 쪽 열쇠 → "2장 10쪽" / "명문장 · 21장 여우의 비밀" — 타수 탭에서 어느 쪽을 쳤는지 보여 준다 */
const SHEET_TITLES = new Map(
  [...FULL_SHEETS, ...FAMOUS_SHEETS].map((sheet) => [sheet.key, sheet.title])
);

const BOARDS: {
  key: TypingBoard;
  label: string;
  unit: string;
  note: string;
}[] = [
  {
    key: 'speed',
    label: '타수',
    unit: '타',
    note: '정확도 95% 이상으로 끝까지 쓴 쪽의 최고 평균 타수예요. 비회원도 닉네임으로 오를 수 있고, 폰으로 낸 기록엔 "모바일" 표시가 붙어요.',
  },
  {
    key: 'steady',
    label: '꾸준함',
    unit: '쪽',
    note: '이번 주(월요일 0시부터) 끝까지 쓴 쪽 수예요. 같은 쪽은 한 주에 한 번만 세요.',
  },
];

/**
 * 필사 랭킹 — 탭 두 개(타수·꾸준함, HJ 2026-11-25 "둘 다" · 타수 먼저).
 * 순위에는 참여를 켠 사람만, 닉네임 첫 글자만 보이게("책**") 나온다. 내 이름만 그대로. 기본은 꺼짐.
 * 타수 탭에는 비회원(닉네임만)도 섞이고 "비회원" 표시가 붙는다. 그 타수를 낸 쪽도 함께 보인다(HJ 2026-11-26).
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
  const [board, setBoard] = useState<TypingBoard>('speed');
  const [optIn, setOptIn] = useState(rankOptIn);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const current = BOARDS.find((b) => b.key === board)!;
  const lines = rankLines(rankings[board]);

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
    <section
      id='typing-ranking'
      className='flex scroll-mt-6 flex-col gap-4 rounded-2xl border border-line-soft bg-card p-5 sm:p-6'
    >
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
                key={line.index}
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
                <span className='flex min-w-0 flex-col'>
                  <span className='flex min-w-0 items-center gap-1.5'>
                    <span className='truncate text-text-body'>
                      {line.row.nickname}
                      {line.isMe && ' (나)'}
                    </span>
                    {line.row.isMobile && (
                      <span className='shrink-0 rounded bg-sunken px-1.5 py-0.5 text-[0.6875rem] font-normal text-text-subtle'>
                        모바일
                      </span>
                    )}
                    {line.row.isGuest && (
                      <span className='shrink-0 rounded bg-sunken px-1.5 py-0.5 text-[0.6875rem] font-normal text-text-subtle'>
                        비회원
                      </span>
                    )}
                  </span>
                  {line.row.pageKey && SHEET_TITLES.has(line.row.pageKey) && (
                    <span className='truncate text-xs font-normal text-text-subtle'>
                      {SHEET_TITLES.get(line.row.pageKey)}
                    </span>
                  )}
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
                순위에 참여하기
              </p>
              <p className='text-xs text-text-subtle'>
                다른 사람에게는 닉네임 첫 글자만 보여요(책**). 끄면 순위에
                나오지 않아요.
              </p>
            </div>
            <Switch
              aria-label='순위에 참여하기'
              checked={optIn}
              disabled={isPending}
              onCheckedChange={toggle}
            />
          </div>
        ) : (
          <div className='text-sm text-text-subtle'>
            <p>
              비회원도 정확도 95% 이상이면 결과 창에서 닉네임으로 타수 랭킹에
              올릴 수 있어요. 로그인하면 진행도와 꾸준함 순위까지 쌓여요.
            </p>
            <Link
              href={loginHref}
              className='mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90'
            >
              로그인하고 랭킹 참여
            </Link>
          </div>
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
