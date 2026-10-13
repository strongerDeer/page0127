'use client';

import dynamic from 'next/dynamic';

import {
  categoryColor,
  getBalanceDelta,
  getBalanceLabel,
  getBalanceSummary,
} from '../model/balanceCopy';

import type { ReadingBalance } from '@/entities/book';

// 레이더는 recharts — 브라우저 측정(ResponsiveContainer)이 필요해 초기 번들·SSR 에서 뺀다
const CategoryRadarChart = dynamic(
  () => import('./CategoryRadarChart').then((m) => m.CategoryRadarChart),
  {
    ssr: false,
    loading: () => (
      <div className='h-[300px] animate-pulse rounded-lg bg-muted' />
    ),
  }
);

type ReadingBalanceCardProps = {
  year: number;
  balance: ReadingBalance;
};

/**
 * ⑤ 독서 균형 — "고르게 읽고 있나".
 * 왼쪽 레이더(9축 고정)는 모양으로, 오른쪽 띠·순위는 정확한 비율로 같은 것을 보여 준다.
 */
export const ReadingBalanceCard = ({
  year,
  balance,
}: ReadingBalanceCardProps) => {
  const delta = getBalanceDelta(balance);
  const hasBooks = balance.total > 0;
  const maxCount = balance.ranked[0]?.count ?? 1;

  return (
    <section className='grid gap-6 rounded-2xl border border-line-soft bg-card p-6 md:grid-cols-[260px_1fr] md:items-center'>
      <CategoryRadarChart data={balance.categories} />

      <div className='min-w-0'>
        <div className='flex items-baseline justify-between gap-2'>
          <h3 className='text-base font-bold text-text-strong'>
            {year} 독서 균형
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
            <div className='mt-4 flex items-baseline gap-2'>
              {balance.score !== null && (
                <strong className='text-3xl font-bold text-text-strong'>
                  {balance.score}
                </strong>
              )}
              <span className='text-xs text-text-subtle'>
                {balance.score !== null && '/100 고른 정도 · '}
                <b className='text-text-body'>
                  {getBalanceLabel(balance.score)}
                </b>
              </span>
            </div>

            {/* 식단 띠 — 100% 가로 막대. 색은 순위 순서대로 차트 토큰 */}
            <div
              className='mt-3 flex h-7 overflow-hidden rounded-lg'
              aria-hidden
            >
              {balance.ranked.map(({ category, share }, rank) => (
                <div
                  key={category}
                  className='flex items-center justify-center truncate px-1 text-xs text-white'
                  style={{
                    width: `${share}%`,
                    backgroundColor: categoryColor(rank),
                  }}
                >
                  {share >= 12 ? category.split('/')[0] : ''}
                </div>
              ))}
            </div>

            <ul className='mt-3 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2'>
              {balance.ranked.map(({ category, count, share }, rank) => (
                <li
                  key={category}
                  className='grid grid-cols-[88px_1fr_20px] items-center gap-2'
                >
                  <span className='truncate text-text-body'>{category}</span>
                  <span className='h-2 overflow-hidden rounded-full bg-sunken'>
                    <span
                      className='block h-full rounded-full'
                      style={{
                        width: `${(count / maxCount) * 100}%`,
                        backgroundColor: categoryColor(rank),
                      }}
                    />
                  </span>
                  <span
                    className='text-right text-text-strong'
                    aria-label={`${count}권, ${share}%`}
                  >
                    {count}
                  </span>
                </li>
              ))}
            </ul>

            {balance.zero.length > 0 && (
              <p className='mt-3 flex flex-wrap items-center gap-1 text-xs text-text-subtle'>
                아직 0권
                {balance.zero.map((category) => (
                  <span
                    key={category}
                    className='rounded-full border border-dashed border-line-soft px-2 py-0.5'
                  >
                    {category}
                  </span>
                ))}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};
