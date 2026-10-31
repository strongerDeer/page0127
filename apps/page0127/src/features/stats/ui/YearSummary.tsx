import { Button } from '@repo/ui';
import { Pencil } from 'lucide-react';

import { getReadingPace } from '@/entities/book';

import { getPaceMessage } from '../model/paceMessage';

import type { MonthlyReadingData } from '@/entities/book';
import type { ReactNode } from 'react';

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
  /**
   * 목표 달성 공유 버튼 — 올해 목표를 채웠을 때만 보인다.
   * 공유 시트는 features/share 의 것이라 여기서 만들지 않고 위젯이 넣어 준다(features 끼리 import 하지 않는다)
   */
  goalShare?: ReactNode;
};

type FactProps = {
  value: string;
  label: string;
  /** 모바일 2열에서 한 줄을 다 쓴다(넓으면 다시 한 칸) */
  wide?: boolean;
};

const Fact = ({ value, label, wide = false }: FactProps) => (
  <div
    className={`rounded-xl bg-sunken px-3 py-2 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}
  >
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
  goalShare,
}: YearSummaryProps) => {
  const pace = getReadingPace({ completed, target, year, today });
  const message = getPaceMessage({ pace, completed, target, isOwner });
  const hasGoal = target > 0;
  const progress = hasGoal
    ? Math.min(Math.round((completed / target) * 100), 100)
    : 0;
  const isPast = pace.state === 'past_met' || pace.state === 'past_missed';
  // 자랑할 순간은 올해 목표를 채운 뒤뿐이다
  const showGoalShare = Boolean(goalShare) && pace.state === 'met';
  // 0권이면 통계 칸이 전부 빠져 오른쪽이 한 줄만 남는다 → 큰 숫자를 줄이고 카드를 낮게 접는다
  const isCompact = completed === 0;

  // 환산은 계산할 수 있는 것만 — 종이 한 장(2쪽) 0.1mm, 1분/쪽(기존 독서 시간 규칙)
  const stackCm = Math.round(totalPages / 200);
  const hours = Math.round(totalPages / 60);
  const best = monthlyReading.reduce(
    (top, m) => (m.count > top.count ? m : top),
    { month: 0, count: 0 }
  );

  const facts: { value: string; label: string }[] = [
    // 쪽수를 모르는 책뿐이면 "0cm · 영화 0편"이 되어 의미가 없다 → 숨긴다
    ...(totalPages > 0
      ? [
          {
            value: `${totalPages.toLocaleString()}쪽`,
            label: `쌓으면 약 ${stackCm}cm`,
          },
          {
            value: `약 ${hours}시간`,
            label: `영화 ${Math.floor(hours / 2)}편 볼 시간`,
          },
        ]
      : []),
    ...(best.count > 0
      ? [
          {
            value: `${best.month}월`,
            label: `가장 많이 읽은 달 (${best.count}권)`,
          },
        ]
      : []),
    // 평점도 인생책도 없으면 "— · 인생책 0권"만 남는다 → 0권 첫 화면에선 칸 자체를 숨긴다
    ...(averageRating > 0 || lifeBookCount > 0
      ? [
          {
            value: averageRating > 0 ? `${averageRating.toFixed(1)}점` : '—',
            label: `평균 평점 · 인생책 ${lifeBookCount}권`,
          },
        ]
      : []),
  ];

  return (
    <section
      data-compact={isCompact || undefined}
      className={`grid rounded-[28px] border border-line-soft bg-card md:grid-cols-[200px_1fr] md:items-center ${
        isCompact ? 'gap-3 px-6 py-5 sm:px-8' : 'gap-6 p-6 sm:p-8'
      }`}
    >
      {isCompact ? (
        // 왼쪽 칸 폭(200px)은 그대로 둬서 한마디가 권수가 있는 해와 같은 자리에서 시작한다
        <p className='flex items-baseline gap-2 text-sm text-text-subtle'>
          {year}년에 완독한 책
          <span className='text-3xl font-bold tracking-[-0.04em] text-text-strong'>
            {completed}
            <span className='ml-0.5 text-base font-medium text-text-subtle'>
              권
            </span>
          </span>
        </p>
      ) : (
        <div>
          <p className='text-sm text-text-subtle'>{year}년에 완독한 책</p>
          <p className='mt-1 text-6xl font-bold tracking-[-0.04em] text-text-strong'>
            {completed}
            <span className='ml-1 text-xl font-medium text-text-subtle'>
              권
            </span>
          </p>
        </div>
      )}

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
          {/* 둘 다 없으면 칸을 만들지 않는다 — 빈 칸이 줄바꿈 자리를 먹는다 */}
          {(showGoalShare || onSetGoal) && (
            <div className='flex shrink-0 items-center gap-1'>
              {showGoalShare && goalShare}
              {onSetGoal && (
                <Button
                  variant={message.suggestGoalEdit ? 'outline' : 'ghost'}
                  size='sm'
                  className='text-text-subtle'
                  onClick={onSetGoal}
                >
                  <Pencil className='size-3.5' />
                  {hasGoal ? '목표 수정' : '목표 정하기'}
                </Button>
              )}
            </div>
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
        {facts.length > 0 && (
          <div
            data-facts
            className='mt-4 grid grid-cols-2 gap-2 sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr'
          >
            {facts.map((fact, i) => (
              <Fact
                key={fact.label}
                {...fact}
                // 홀수 칸이면 마지막 칸이 모바일 2열에 혼자 반 칸으로 남는다 → 한 줄을 다 쓴다
                wide={facts.length % 2 === 1 && i === facts.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
