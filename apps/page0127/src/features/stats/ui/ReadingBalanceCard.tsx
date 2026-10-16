'use client';

import dynamic from 'next/dynamic';

import {
  categoryColor,
  getBalanceDelta,
  getBalanceLabel,
  getBalanceSummary,
  radarAxes,
} from '../model/balanceCopy';

import type { ReadingBalance } from '@/entities/book';

// 레이더는 recharts — 브라우저 측정(ResponsiveContainer)이 필요해 SSR 에서 뺀다
const CategoryRadarChart = dynamic(
  () => import('./CategoryRadarChart').then((m) => m.CategoryRadarChart),
  {
    ssr: false,
    loading: () => <div className='h-full animate-pulse rounded-lg bg-muted' />,
  }
);

type ReadingBalanceCardProps = {
  /** 연도 탭의 해 — 없으면 전체 탭("지금까지", 작년 비교 없이) */
  year?: number;
  balance: ReadingBalance;
};

/**
 * ⑤ 독서 균형 — "고르게 읽고 있나".
 * 왼쪽 레이더는 내가 읽은 분야만(최대 8축) 모양으로, 오른쪽 띠는 정확한 비율로 보여 준다.
 * 안 읽은 분야는 축에 넣지 않고 한 줄 텍스트로 — 9축 고정일 때는 빈 축이 모양을 찌그러뜨렸다.
 */
export const ReadingBalanceCard = ({
  year,
  balance,
}: ReadingBalanceCardProps) => {
  const delta = getBalanceDelta(balance);
  const hasBooks = balance.total > 0;
  const axes = radarAxes(balance);
  const hasRadar = axes.length > 0;

  return (
    <section
      className={`grid gap-6 rounded-2xl border border-line-soft bg-card p-6 sm:p-8 md:items-center ${
        hasRadar ? 'md:grid-cols-[360px_1fr]' : ''
      }`}
    >
      {/* 모바일은 짧은 라벨·좁은 여백(radarLayout)이라 폭이 남는다 — 높이 260 이면 폭과 비슷해져
          레이더가 가장 크게 그려진다(220 이면 높이가 막아 지름 127px 에 머물렀다) */}
      {hasRadar && (
        <div className='h-[260px] md:h-[340px]'>
          <CategoryRadarChart data={axes} height='100%' />
        </div>
      )}

      <div className='min-w-0'>
        <div className='flex items-baseline justify-between gap-2'>
          <h3 className='text-base font-bold text-text-strong'>
            {year ?? '지금까지'} 독서 균형
          </h3>
          <span className='text-xs text-text-subtle'>
            9개 분야 · 완독 {balance.total}권
          </span>
        </div>
        <p className='mt-2 break-keep text-base font-bold text-text-strong'>
          {getBalanceSummary(balance)}
        </p>
        {delta && <p className='mt-1 text-sm text-text-body'>{delta}</p>}

        {hasBooks && (
          <>
            <div className='mt-5 flex items-baseline gap-2'>
              {balance.score !== null && (
                <strong className='text-4xl font-bold text-text-strong'>
                  {balance.score}
                </strong>
              )}
              <span className='text-sm text-text-subtle'>
                {balance.score !== null && '/100 고른 정도 · '}
                <b className='text-text-body'>
                  {getBalanceLabel(balance.score)}
                </b>
              </span>
            </div>

            {/* 식단 띠 — 100% 가로 막대. 칸마다 권수·비율은 툴팁, 화면낭독기는 아래 문장으로.
                폭은 권수로 나눈다(flex-grow) — 반올림한 %를 더하면 98%처럼 모자라 오른쪽 끝이 비었다.
                min-w-0: 글자 폭보다 작게 줄어들 수 있어야 칸끼리 글자가 붙지 않는다 */}
            <div
              className='mt-4 flex h-9 overflow-hidden rounded-xl'
              aria-hidden
            >
              {balance.ranked.map(({ category, count, share }, rank) => (
                <div
                  key={category}
                  title={`${category} ${count}권 · ${share}%`}
                  className='flex min-w-0 basis-0 items-center justify-center px-1 text-xs font-medium text-white'
                  style={{
                    flexGrow: count,
                    backgroundColor: categoryColor(rank),
                  }}
                >
                  {share >= 12 && (
                    // 25% 미만 칸은 모바일 폭(띠 약 280px)에선 이름이 다 안 들어간다(21% 칸이 '자기계…') → sm 부터
                    <span
                      className={`truncate ${share < 25 ? 'hidden sm:inline' : ''}`}
                    >
                      {`${category.split('/')[0]} ${count}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className='sr-only'>
              {balance.ranked
                .map(
                  ({ category, count, share }) =>
                    `${category} ${count}권(${share}%)`
                )
                .join(', ')}
            </p>

            {balance.zero.length > 0 && (
              <p className='mt-4 break-keep text-sm text-text-subtle'>
                아직 안 읽은 분야 — {balance.zero.join(' · ')}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};
