import Link from 'next/link';

import { computeProgress } from '@/entities/typing';

/**
 * 내 필사 진행도 — 전체 몇 %, 27장 중 몇 장(로그인한 계정만 기록, HJ 2026-11-25).
 * 전체 %는 번역 전 장의 분량을 원문 길이로 어림해서 낸다(장이 추가될수록 정확해진다).
 */
export const TypingProgressCard = ({
  doneKeys,
  memberId,
  loginHref,
}: {
  doneKeys: string[];
  memberId: string | null;
  loginHref: string;
}) => {
  const progress = computeProgress(new Set(doneKeys));

  return (
    <section className='flex flex-col gap-4 rounded-2xl border border-line-soft bg-card p-5 sm:p-6'>
      <h2 className='text-lg font-bold text-text-strong'>내 필사 진행도</h2>

      {memberId ? (
        <>
          <div className='flex items-end gap-3'>
            <span className='text-4xl font-bold tabular-nums text-primary'>
              {progress.percent}
              <span className='text-xl'>%</span>
            </span>
            <span className='pb-1 text-sm text-text-subtle'>
              27장 중 {progress.doneChapters}장 완료 · 지금까지{' '}
              {progress.doneChars.toLocaleString()}자를 따라 썼어요
            </span>
          </div>
          <div
            className='h-2.5 overflow-hidden rounded-full bg-sunken'
            role='progressbar'
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            aria-label='『어린 왕자』 전체 필사'
          >
            <div
              className='h-full rounded-full bg-primary'
              style={{ width: `${Math.max(progress.percent, 1)}%` }}
            />
          </div>
        </>
      ) : (
        <p className='rounded-xl bg-sunken px-4 py-5 text-sm text-text-body'>
          <Link
            href={loginHref}
            className='font-bold text-primary underline-offset-4 hover:underline'
          >
            로그인
          </Link>
          하면 다 쓴 쪽이 계정에 남아서, 폰과 PC 어디서든 이어 쓸 수 있어요.
        </p>
      )}

      <ol className='grid grid-cols-9 gap-1.5' aria-label='장별 진행'>
        {progress.chapters.map((state, i) => (
          <li
            key={i}
            title={`${i + 1}장`}
            className={`rounded-md py-1 text-center text-xs tabular-nums ${
              state === 'full'
                ? 'bg-primary font-bold text-primary-foreground'
                : state === 'half'
                  ? 'bg-accent font-bold text-text-strong'
                  : state === 'locked'
                    ? 'bg-sunken text-text-subtle/50'
                    : 'border border-line-soft text-text-subtle'
            }`}
          >
            {i + 1}
            <span className='sr-only'>
              장{' '}
              {state === 'full'
                ? '다 씀'
                : state === 'half'
                  ? '쓰는 중'
                  : state === 'locked'
                    ? '준비 중'
                    : '안 씀'}
            </span>
          </li>
        ))}
      </ol>
      <p className='text-xs text-text-subtle'>
        진한 칸은 다 쓴 장, 연한 칸은 쓰는 중인 장이에요.
      </p>
    </section>
  );
};
