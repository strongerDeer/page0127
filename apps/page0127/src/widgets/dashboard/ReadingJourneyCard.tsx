import { BookOpen, FileText, Calendar, Clock } from 'lucide-react';
import { StatCard } from '@/shared/ui/StatCard';

import type { ReadingJourney } from '@/entities/book/types/stats';

type Props = {
  data: ReadingJourney;
};

/**
 * 독서 여정 카드 컴포넌트
 *
 * 학습 포인트:
 * - 전체 독서 통계 섹션의 핵심 컴포넌트
 * - 2x2 그리드 레이아웃 (반응형)
 * - 성취감과 동기 부여를 위한 지표
 *
 * @param data - 독서 여정 데이터
 */
export const ReadingJourneyCard = ({ data }: Props) => {
  // 날짜 포맷팅 (YYYY-MM-DD → YYYY.MM)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* 1. 읽은 책 */}
      <StatCard
        icon={<BookOpen className="h-5 w-5" />}
        title="읽은 책"
        value={data.totalBooks}
        unit="권"
        description={`⭐ 10점: ${data.perfectScoreBooks}권 (${data.perfectScoreRate}%)`}
        variant="blue"
      />

      {/* 2. 읽은 쪽수 */}
      <StatCard
        icon={<FileText className="h-5 w-5" />}
        title="읽은 쪽수"
        value={data.totalPages}
        unit="쪽"
        description={`📅 하루 평균: ${data.averagePagesPerDay}쪽`}
        variant="purple"
      />

      {/* 3. 독서 기간 */}
      <StatCard
        icon={<Calendar className="h-5 w-5" />}
        title="독서 기간"
        value={`${data.readingYears}년`}
        description={`${formatDate(data.readingSince)} ~ 현재`}
        variant="amber"
      />

      {/* 4. 예상 독서 시간 */}
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        title="예상 독서 시간"
        value={data.estimatedHours}
        unit="시간"
        description={`약 ${data.estimatedDays}일`}
        variant="indigo"
      />
    </div>
  );
};
