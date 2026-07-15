import { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

import { Card, CardContent } from './card';

type StatCardProps = {
  /** 지표를 상징하는 작은 글리프 — 무채색으로 조용히 둔다 (선택) */
  icon?: ReactNode;
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  /**
   * 다른 카드 안에 중첩될 때 — 테두리 없이 sunken 틴트 타일로.
   * (카드 안 카드의 이중 테두리 노이즈 방지)
   */
  flat?: boolean;
};

/**
 * 지표 타일 — 숫자가 주인공
 *
 * 세로 배치(라벨 → 숫자 → 설명). 아이콘은 무채색 글리프로 라벨 옆에 조용히.
 * 큰 숫자는 잉크로 고정(가독성) — 색은 차트가 담당한다.
 * (이전 버전은 카드마다 다른 색 아이콘칩 + 이중 패딩으로 붕 떠 보였다)
 */
export const StatCard = ({
  icon,
  title,
  value,
  unit,
  description,
  flat = false,
}: StatCardProps) => {
  return (
    // 그림자 없음 — 입체는 1px 보더. Card 의 py-6 로 세로 여백, CardContent 는 px-5 만.
    // flat: 중첩용 — 테두리 대신 sunken 틴트, 여백은 살짝 좁게(py-4/px-4)
    <Card
      className={cn('shadow-none', flat && 'gap-0 border-0 bg-sunken py-4')}
    >
      <CardContent className={flat ? 'px-4' : 'px-5'}>
        <div className='flex items-center gap-1.5 text-text-subtle'>
          {icon && (
            <span className='text-text-faint [&_svg]:size-4'>{icon}</span>
          )}
          <span className='text-sm font-medium'>{title}</span>
        </div>

        {/* 숫자 — 잉크로 고정(가독성). 색은 차트가 담당. tabular-nums 로 자릿수 안정 */}
        <div className='mt-3 flex items-baseline gap-1'>
          <span className='text-3xl leading-none font-bold tracking-tight tabular-nums text-text-strong'>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {unit && (
            <span className='text-sm font-medium text-text-subtle'>{unit}</span>
          )}
        </div>

        {description && (
          <p className='mt-2 text-xs text-text-faint'>{description}</p>
        )}
      </CardContent>
    </Card>
  );
};
