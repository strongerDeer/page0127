import { Button } from '@repo/ui';
import { Pencil } from 'lucide-react';

import { getReadingPace } from '@/entities/book';

import { getPaceMessage } from '../model/paceMessage';

import type { MonthlyReadingData } from '@/entities/book';

type YearSummaryProps = {
  year: number;
  /** 한국 시간 기준 오늘 'YYYY-MM-DD' — 서버에서 한 번 만들어 내려온다 */
  today: string;
  completed: number;
  target: number;
  totalPages: number;
  averageRating: number;
  lifeBookCount: number;
  monthlyReading: MonthlyReadingData[];
  isOwner: boolean;
  /** 주인 + 올해일 때만 넘어온다 */
  onSetGoal?: () => void;
};

type FactProps = { value: string; label: string };

const Fact = ({ value, label }: FactProps) => (
  <div className='rounded-xl bg-sunken px-3 py-2'>
    <p className='text-base font-bold text-text-strong'>{value}</p>
    <p className='text-xs text-text-subtle'>{label}</p>
  </div>
);

/**
 * ② 올해 요약 — 이 섹션의 주인공은 "읽은 권수"다.
 * 목표는 보조 정보(작은 막대)로 내리고, 대신 지금 속도를 한 문장으로 말해 준다.
 */
export const YearSummary = ({
  year,
  today,
  completed,
  target,
  totalPages,
  averageRating,
  lifeBookCount,
  monthlyReading,
  isOwner,
  onSetGoal,
}: YearSummaryProps) => {
  const pace = getReadingPace({ completed, target, year, today });
  const message = getPaceMessage({ pace, completed, target, isOwner });
  const hasGoal = target > 0;
  const progress = hasGoal
    ? Math.min(Math.round((completed / target) * 100), 100)
    : 0;
  const isPast = pace.state === 'past_met' || pace.state === 'past_missed';

  // 환산은 계산할 수 있는 것만 — 종이 한 장(2쪽) 0.1mm, 1분/쪽(기존 독서 시간 규칙)
  const stackCm = Math.round(totalPages / 200);
  const hours = Math.round(totalPages / 60);
  const best = monthlyReading.reduce(
    (top, m) => (m.count > top.count ? m : top),
    { month: 0, count: 0 }
  );

  return (
    <section className='grid gap-6 rounded-[28px] border border-line-soft bg-card p-6 sm:p-8 md:grid-cols-[200px_1fr] md:items-center'>
      <div>
        <p className='text-sm text-text-subtle'>{year}년에 완독한 책</p>
        <p className='mt-1 text-6xl font-bold tracking-[-0.04em] text-text-strong'>
          {completed}
          <span className='ml-1 text-xl font-medium text-text-subtle'>권</span>
        </p>
      </div>

      <div className='min-w-0'>
        <div className='flex flex-wrap items-start justify-between gap-2'>
          <div className='min-w-0'>
            <p className='break-keep text-base font-bold text-text-strong'>
              {message.headline}
            </p>
            {message.detail && (
              <p className='mt-1 break-keep text-sm text-text-body'>
                {message.detail}
              </p>
            )}
          </div>
          {onSetGoal && (
            <Button
              variant={message.suggestGoalEdit ? 'outline' : 'ghost'}
              size='sm'
              className='shrink-0 text-text-subtle'
              onClick={onSetGoal}
            >
              <Pencil className='size-3.5' />
              {hasGoal ? '목표 수정' : '목표 정하기'}
            </Button>
          )}
        </div>

        {hasGoal && (
          <div className='mt-4'>
            <div className='mb-1.5 flex justify-between text-xs text-text-subtle'>
              <span>
                목표 {target}권 · {progress}%
              </span>
              {!isPast && <span>오늘 기준 예상 위치 ▍</span>}
            </div>
            <div
              role='progressbar'
              aria-label={`${year}년 독서 목표 진행률`}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className='relative h-1.5 rounded-full bg-sunken'
            >
              <div
                className='h-full rounded-full bg-primary'
                style={{ width: `${progress}%` }}
              />
              {!isPast && (
                // 오늘까지 와 있어야 할 위치 — 장식이라 스크린리더에서 숨긴다
                <span
                  data-pace-marker
                  aria-hidden
                  className='absolute -top-1 h-3.5 w-0.5'
                  style={{
                    left: `${Math.round(pace.elapsed * 100)}%`,
                    backgroundColor: 'var(--chart-4)',
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* 같은 폭 격자 — 모바일 2열, 넓으면 칸 수만큼 한 줄을 등분(쪽수 0 으로 칸이 빠져도 등분) */}
        <div
          data-facts
          className='mt-4 grid grid-cols-2 gap-2 sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr'
        >
          {/* 쪽수를 모르는 책뿐이면 "0cm · 영화 0편"이 되어 의미가 없다 → 숨긴다 */}
          {totalPages > 0 && (
            <>
              <Fact
                value={`${totalPages.toLocaleString()}쪽`}
                label={`쌓으면 약 ${stackCm}cm`}
              />
              <Fact
                value={`약 ${hours}시간`}
                label={`영화 ${Math.floor(hours / 2)}편 볼 시간`}
              />
            </>
          )}
          {best.count > 0 && (
            <Fact
              value={`${best.month}월`}
              label={`가장 많이 읽은 달 (${best.count}권)`}
            />
          )}
          <Fact
            value={averageRating > 0 ? `${averageRating.toFixed(1)}점` : '—'}
            label={`평균 평점 · 인생책 ${lifeBookCount}권`}
          />
        </div>
      </div>
    </section>
  );
};
