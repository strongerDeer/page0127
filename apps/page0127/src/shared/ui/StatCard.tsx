import { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

import { Card, CardContent } from './card';

type StatCardVariant =
  | 'blue'
  | 'purple'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'indigo'
  | 'sky'
  | 'cyan'
  | 'slate';

type StatCardProps = {
  icon: ReactNode;
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  variant?: StatCardVariant;
};

// 아이콘 컨테이너 색은 우리 팔레트(primary + chart-2~5 + muted)로 매핑
// — API 호환을 위해 기존 9개 variant 이름 유지, blue/sky/cyan/indigo는 primary로 통합
const ICON_VARIANT_STYLES: Record<StatCardVariant, string> = {
  blue: 'bg-primary/10 text-primary',
  sky: 'bg-primary/10 text-primary',
  cyan: 'bg-primary/10 text-primary',
  indigo: 'bg-primary/10 text-primary',
  purple: 'bg-chart-2/15 text-chart-2',
  emerald: 'bg-chart-3/15 text-chart-3',
  amber: 'bg-chart-4/15 text-chart-4',
  rose: 'bg-chart-5/15 text-chart-5',
  slate: 'bg-muted text-muted-foreground',
};

export const StatCard = ({
  icon,
  title,
  value,
  unit,
  description,
  variant = 'blue',
}: StatCardProps) => {
  const iconStyle = ICON_VARIANT_STYLES[variant] ?? ICON_VARIANT_STYLES.blue;

  return (
    // shadcn Card 기본 shadow-sm 제거 — 정책: 기본 카드는 테두리만
    <Card className='shadow-none'>
      <CardContent className='flex items-center justify-between p-6'>
        <div className='space-y-1'>
          <p className='text-sm font-medium text-muted-foreground'>{title}</p>
          <div className='flex items-baseline gap-1'>
            <p className='text-3xl font-bold tracking-tight text-foreground'>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {unit && (
              <span className='text-sm font-semibold text-muted-foreground'>
                {unit}
              </span>
            )}
          </div>
          {description && (
            <p className='text-xs text-muted-foreground'>{description}</p>
          )}
        </div>

        {/* 아이콘 컨테이너 — variant별 tinted 색 (인디고 베이스 + 보조 파스텔) */}
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-md',
            iconStyle
          )}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
};
