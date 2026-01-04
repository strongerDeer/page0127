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
/**
 * 아이콘별 그라데이션 색상 매핑
 * 학습 포인트: 토스 스타일의 컬러풀한 카드 디자인
 */
const getCardGradient = (icon: string) => {
  const gradients: Record<string, string> = {
    '📚': 'from-blue-500 to-blue-600',
    '📖': 'from-purple-500 to-purple-600',
    '⭐': 'from-yellow-500 to-yellow-600',
    '❤️': 'from-rose-500 to-rose-600',
    '🎯': 'from-emerald-500 to-emerald-600',
    '✅': 'from-teal-500 to-teal-600',
  };
  return gradients[icon] || 'from-gray-500 to-gray-600';
};

export const StatCard = ({
  icon,
  title,
  value,
  unit,
  description,
}: StatCardProps) => {
  const gradient = getCardGradient(icon);

  return (
    <Card className='group relative overflow-hidden border-0 shadow-md transition-all hover:scale-105 hover:shadow-xl'>
      <CardContent className='p-6'>
        {/* 배경 그라데이션 */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-100`} />

        {/* 내용 */}
        <div className='relative z-10 space-y-2 text-white'>
          {/* 아이콘 */}
          <div className='text-3xl'>{icon}</div>

          {/* 제목 */}
          <p className='text-sm font-medium text-white/80'>{title}</p>

          {/* 값 */}
          <div className='flex items-baseline gap-1.5'>
            <p className='text-4xl font-bold tracking-tight'>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {unit && (
              <span className='text-lg font-semibold text-white/80'>{unit}</span>
            )}
          </div>

          {description && (
            <p className='pt-1 text-xs text-white/70'>
              {description}
            </p>
          )}
        </div>

        {/* 장식 요소 */}
        <div className='absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10' />
        <div className='absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5' />
      </CardContent>
    </Card>
  );
};
