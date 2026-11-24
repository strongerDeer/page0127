'use client';

import dynamic from 'next/dynamic';

import { RenderWhenNear } from '@/shared/ui/RenderWhenNear';

import {
  BALANCE_CATEGORIES,
  MIN_BOOKS_FOR_SCORE,
  type ReadingBalance,
} from '@/entities/book';

import {
  BALANCE_SCORE_HELP,
  categoryColor,
  categoryInk,
  getBalanceDelta,
  getBalanceLabel,
  getBalanceScoreWait,
  getBalanceSummary,
  nextCategories,
  radarAxes,
} from '../model/balanceCopy';

const ChartSkeleton = () => (
  <div className='h-full animate-pulse rounded-lg bg-muted' />
);

// 레이더는 recharts — 브라우저 측정(ResponsiveContainer)이 필요해 SSR 에서 뺀다.
// 청크는 RenderWhenNear 가 화면 가까이서 그리기 시작할 때 받는다
const CategoryRadarChart = dynamic(
  () => import('./CategoryRadarChart').then((m) => m.CategoryRadarChart),
  { ssr: false, loading: ChartSkeleton }
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
  const next = nextCategories(balance);
  // 서점 이름이 분야 이름과 같은 칸은 띠가 이미 다 보여 준다 — 묶인 게 있을 때만 상세를 연다.
  // '인문' → 인문학처럼 분야 이름의 앞부분이기만 해도 같은 이름으로 본다(운영에서 '인문 1'이 군더더기로 붙었다)
  const sameName = (category: string, label: string) =>
    category.replace(/[\s/]/g, '').startsWith(label.replace(/[\s/]/g, ''));
  const merged = (category: string, sources: { label: string }[]) =>
    sources.length > 1 || !sameName(category, sources[0]?.label ?? '');
  const hasDetail = balance.ranked.some(({ category, sources }) =>
    merged(category, sources)
  );
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
        <RenderWhenNear
          className='h-[260px] md:h-[340px]'
          placeholder={<ChartSkeleton />}
        >
          <CategoryRadarChart data={axes} height='100%' />
        </RenderWhenNear>
      )}

      <div className='min-w-0'>
        <div className='flex items-baseline justify-between gap-2'>
          <h2 className='text-base font-bold text-text-strong'>
            {year ?? '지금까지'} 독서 균형
          </h2>
          <span className='text-xs text-text-subtle'>
            {BALANCE_CATEGORIES.length}개 분야 · 완독 {balance.total}권
          </span>
        </div>
        <p className='mt-2 break-keep text-base font-bold text-text-strong'>
          {getBalanceSummary(balance)}
        </p>
        {delta && <p className='mt-1 text-sm text-text-body'>{delta}</p>}

        {hasBooks && (
          <>
            {/* 균형 점수 — 이름표 · 점수 · 늘 보이는 설명(시안 S1, 게이지는 불필요해 뺌).
                3권 전엔 점수 대신 몇 권 남았는지(MIN_BOOKS_FOR_SCORE) */}
            <div className='mt-5'>
              <p className='text-xs font-medium text-text-subtle'>균형 점수</p>
              {balance.score !== null ? (
                <>
                  <div className='mt-1 flex flex-wrap items-baseline gap-x-2'>
                    <strong className='text-4xl font-bold text-text-strong tabular-nums'>
                      {balance.score}
                      <span className='ml-0.5 text-base font-medium'>점</span>
                    </strong>
                    <span className='text-sm text-text-subtle'>
                      / 100 ·{' '}
                      <b className='text-text-body'>
                        {getBalanceLabel(balance.score)}
                      </b>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className='mt-1 break-keep text-base font-bold text-text-body'>
                    {getBalanceScoreWait(balance)}
                  </p>
                  <div
                    role='progressbar'
                    aria-label='균형 점수까지 읽은 권수'
                    aria-valuemin={0}
                    aria-valuemax={MIN_BOOKS_FOR_SCORE}
                    aria-valuenow={balance.total}
                    className='mt-2 h-2 overflow-hidden rounded-full bg-sunken'
                  >
                    <div
                      className='h-full rounded-full bg-primary'
                      style={{
                        width: `${(balance.total / MIN_BOOKS_FOR_SCORE) * 100}%`,
                      }}
                    />
                  </div>
                </>
              )}
              <p className='mt-2 break-keep text-xs text-text-subtle'>
                {BALANCE_SCORE_HELP}
              </p>
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
                  className={`flex min-w-0 basis-0 items-center justify-center px-1 text-xs font-medium ${categoryInk(rank)}`}
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

            {/* 상세 — 8개로 묶기 전 서점 대분류별 권수(YES24는 대분류 하나만 줘서 이 단계까지만 있다) */}
            {hasDetail && (
              <details className='mt-3'>
                <summary className='cursor-pointer select-none text-sm text-text-body'>
                  분야별 자세히 보기
                </summary>
                <ul className='mt-3 grid gap-2 text-sm'>
                  {balance.ranked.map(({ category, count, sources }, rank) => {
                    const showSources = merged(category, sources);
                    return (
                      <li key={category} className='flex items-start gap-2'>
                        <span
                          aria-hidden
                          className='mt-1.5 size-2.5 shrink-0 rounded-full'
                          style={{ backgroundColor: categoryColor(rank) }}
                        />
                        <div className='min-w-0'>
                          <span className='font-medium text-text-strong'>
                            {category} {count}권
                          </span>
                          {showSources && (
                            <p className='break-keep text-xs text-text-subtle'>
                              {sources
                                .map(({ label, count: n }) => `${label} ${n}`)
                                .join(' · ')}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}

            {next.length > 0 && (
              <p className='mt-4 break-keep text-sm text-text-subtle'>
                추천 분야 — {next.join(' · ')}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};
