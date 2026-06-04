import type { RatingDistribution } from '@/entities/book';

type Props = {
  data: RatingDistribution[];
};

// 평점 색상 매핑
const RATING_COLORS: Record<number, string> = {
  10: '#059669', // emerald-600 (진한 초록)
  5: '#10b981', // emerald-500
  4: '#34d399', // emerald-400
  3: '#fbbf24', // amber-400 (노랑)
  2: '#f97316', // orange-500
  1: '#ef4444', // red-500 (빨강)
  0: '#9ca3af', // gray-400 (회색)
};

/**
 * 평점 분포 가로 막대 차트
 *
 * 학습 포인트:
 * - Recharts 대신 CSS로 간단한 가로 막대 구현
 * - 0~10점 평점 분포 시각화
 * - 권수와 비율을 함께 표시
 * - AI 인사이트 메시지
 *
 * @param data - 평점 분포 데이터
 */
export const RatingDistributionChart = ({ data }: Props) => {
  // 데이터가 없으면 빈 상태 표시
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        <p>데이터가 없습니다</p>
      </div>
    );
  }

  // 평균 평점 계산
  const totalBooks = data.reduce((sum, item) => sum + item.count, 0);
  const weightedSum = data.reduce((sum, item) => sum + item.rating * item.count, 0);
  const averageRating = totalBooks > 0 ? (weightedSum / totalBooks).toFixed(1) : '0.0';

  // AI 인사이트 생성
  const getInsight = () => {
    const lowRatingBooks = data
      .filter((item) => item.rating <= 3)
      .reduce((sum, item) => sum + item.count, 0);
    const lowRatingRate = totalBooks > 0 ? (lowRatingBooks / totalBooks) * 100 : 0;

    const perfectBooks = data.find((item) => item.rating === 10)?.count || 0;
    const perfectRate = totalBooks > 0 ? (perfectBooks / totalBooks) * 100 : 0;

    let personality = '';
    let message = '';

    if (lowRatingRate > 40) {
      personality = '엄격한 평가자';
      message = '당신은 매우 엄격한 평가자입니다!';
    } else if (lowRatingRate < 20) {
      personality = '긍정적인 독서가';
      message = '대부분의 책을 즐기시네요!';
    } else {
      personality = '균형 잡힌 평가자';
      message = '좋은 책을 잘 골라 읽으시네요!';
    }

    if (perfectRate > 10) {
      message += ' 인생책도 많으시네요! ⭐';
    }

    return { personality, message };
  };

  const insight = getInsight();

  return (
    <div className="flex flex-col gap-4">
      {/* 평균 평점 */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">평균 평점</p>
        <p className="text-3xl font-bold text-chart-3">{averageRating} / 5.0</p>
        <p className="text-xs text-muted-foreground">전체 {totalBooks}권 기준</p>
      </div>

      {/* 평점 분포 막대 */}
      <div className="flex flex-col gap-2">
        {data.map((item) => (
          <div key={item.rating} className="flex items-center gap-3">
            {/* 평점 라벨 */}
            <div className="w-12 text-right text-sm font-medium text-foreground">
              {item.rating}점
            </div>

            {/* 막대 그래프 */}
            <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: RATING_COLORS[item.rating],
                }}
              />
            </div>

            {/* 권수 & 비율 */}
            <div className="w-28 text-left text-sm text-muted-foreground">
              {item.count}권 ({item.percentage}%)
            </div>

            {/* 특수 라벨 */}
            {item.rating === 10 && item.count > 0 && (
              <span className="text-xs text-chart-3">← 인생책!</span>
            )}
            {item.rating === 0 && item.count > 0 && (
              <span className="text-xs text-muted-foreground">← 평가 안 함</span>
            )}
          </div>
        ))}
      </div>

      {/* AI 인사이트 */}
      <div className="rounded-lg bg-chart-3/10 p-4 text-center">
        <p className="text-sm text-foreground">
          💡 <span className="font-semibold text-chart-3">{insight.personality}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{insight.message}</p>
      </div>
    </div>
  );
};
