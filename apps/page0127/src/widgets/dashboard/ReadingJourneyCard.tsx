import { BookOpen, Calendar, Clock,FileText } from 'lucide-react';

import { StatCard } from '@/shared/ui/StatCard';

import type { ReadingJourney } from '@/entities/book';

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
    // 카드 안에 중첩되므로 flat 타일(테두리 없는 sunken 틴트)로 — 이중 테두리 방지
    <div className="grid grid-cols-2 gap-3">
      {/* 1. 읽은 책 */}
      <StatCard
        flat
        icon={<BookOpen className="h-4 w-4" />}
        title="읽은 책"
        value={data.totalBooks}
        unit="권"
        description={`10점 ${data.perfectScoreBooks}권 (${data.perfectScoreRate}%)`}
      />

      {/* 2. 읽은 쪽수 */}
      <StatCard
        flat
        icon={<FileText className="h-4 w-4" />}
        title="읽은 쪽수"
        value={data.totalPages}
        unit="쪽"
        description={`하루 평균 ${data.averagePagesPerDay}쪽`}
      />

      {/* 3. 독서 기간 */}
      <StatCard
        flat
        icon={<Calendar className="h-4 w-4" />}
        title="독서 기간"
        value={`${data.readingYears}년`}
        description={`${formatDate(data.readingSince)} ~ 현재`}
      />

      {/* 4. 예상 독서 시간 */}
      <StatCard
        flat
        icon={<Clock className="h-4 w-4" />}
        title="예상 독서 시간"
        value={data.estimatedHours}
        unit="시간"
        description={`약 ${data.estimatedDays}일`}
      />
    </div>
  );
};
