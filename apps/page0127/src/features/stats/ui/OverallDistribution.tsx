import type { RatingDistribution } from '@/entities/book';

/**
 * 전체 통계 - 평점 분포 (간단 가로 막대)
 *
 * 학습 포인트:
 * - 카테고리는 레이더, 연도추이는 막대 차트(Recharts)를 재사용하지만
 *   평점 분포는 전체 통계용 RatingReadingData(도넛 타입)가 없어 가로 막대로 표시
 * - Recharts 없이 순수 div → 상단 요약은 인터랙션 불필요, 번들도 가벼움
 */
type OverallDistributionProps = {
  ratings: RatingDistribution[];
};

// 평점 숫자 → 라벨 (10은 만점)
const ratingLabel = (rating: number) => (rating === 10 ? '만점' : `${rating}점`);

export const OverallDistribution = ({ ratings }: OverallDistributionProps) => {
  // count 0인 평점은 숨기고, 최댓값 기준으로 막대 폭 정규화
  const rows = ratings.filter((r) => r.count > 0);
  const max = Math.max(...rows.map((r) => r.count), 1);

  if (rows.length === 0) {
    return <p className='text-sm text-text-faint'>아직 평점이 없어요.</p>;
  }

  return (
    <ul className='space-y-3'>
      {rows.map((r) => (
        <li key={r.rating} className='flex items-center gap-3'>
          <span className='w-12 shrink-0 text-sm text-text-subtle'>
            {ratingLabel(r.rating)}
          </span>
          <div className='relative h-2.5 flex-1 overflow-hidden rounded-full bg-sunken'>
            <div
              className='h-full rounded-full bg-primary transition-[width] duration-500'
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
          <span className='w-10 shrink-0 text-right text-sm font-medium text-text-strong'>
            {r.count}
          </span>
        </li>
      ))}
    </ul>
  );
};
