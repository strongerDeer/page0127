import { Card, CardContent } from './card';

/**
 * 통계 카드 컴포넌트 Props
 */
type StatCardProps = {
  /** 통계 아이콘 (이모지) */
  icon: string;
  /** 통계 제목 */
  title: string;
  /** 통계 값 */
  value: string | number;
  /** 단위 (권, 쪽, % 등) */
  unit?: string;
  /** 추가 설명 (선택) */
  description?: string;
};

/**
 * 통계 카드 컴포넌트
 *
 * 학습 포인트:
 * - 재사용 가능한 통계 표시 컴포넌트
 * - Card 컴포넌트를 래핑하여 일관된 디자인 제공
 * - Props로 유연하게 다양한 통계 표시
 *
 * @example
 * <StatCard
 *   icon="📚"
 *   title="총 읽은 책"
 *   value={12}
 *   unit="권"
 * />
 */
export const StatCard = ({
  icon,
  title,
  value,
  unit,
  description,
}: StatCardProps) => {
  return (
    <Card>
      <CardContent className='pt-6'>
        <div className='flex items-center gap-3'>
          {/* 아이콘 */}
          <div className='text-3xl'>{icon}</div>

          {/* 통계 정보 */}
          <div className='flex-1'>
            <p className='text-sm text-muted-foreground'>{title}</p>
            <div className='flex items-baseline gap-1'>
              <p className='text-2xl font-bold'>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {unit && (
                <span className='text-sm text-muted-foreground'>{unit}</span>
              )}
            </div>
            {description && (
              <p className='mt-1 text-xs text-muted-foreground'>
                {description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
