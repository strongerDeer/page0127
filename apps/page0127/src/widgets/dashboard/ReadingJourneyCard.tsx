import { CalendarDays, Clock3, FileText, Star } from 'lucide-react';

import type { ReadingJourney } from '@/entities/book';

type Props = {
  data: ReadingJourney;
};

const JourneyRow = ({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) => (
  <div className='flex items-center gap-3 py-4'>
    <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-sunken text-text-subtle'>
      {icon}
    </div>
    <div className='min-w-0 flex-1'>
      <p className='text-sm font-medium text-text-strong'>{label}</p>
      <p className='mt-0.5 truncate text-xs text-text-faint'>{description}</p>
    </div>
    <strong className='shrink-0 text-sm text-text-strong'>{value}</strong>
  </div>
);

export const ReadingJourneyCard = ({ data }: Props) => {
  const readingSince = data.readingSince
    ? new Date(data.readingSince).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
      })
    : '기록 시작 전';

  return (
    <div>
      <div className='pb-5'>
        <p className='text-sm font-medium text-text-subtle'>누적 완독</p>
        <div className='mt-2 flex items-end justify-between gap-4'>
          <p className='text-4xl font-bold tracking-[-0.04em] text-text-strong'>
            {data.totalBooks.toLocaleString()}
            <span className='ml-1 text-base font-semibold text-text-subtle'>
              권
            </span>
          </p>
          <p className='pb-1 text-xs text-text-faint'>{readingSince}부터</p>
        </div>
      </div>

      <div className='border-y border-line-soft'>
        <JourneyRow
          icon={<FileText className='size-4' />}
          label='읽은 쪽수'
          value={`${data.totalPages.toLocaleString()}쪽`}
          description={`하루 평균 ${data.averagePagesPerDay}쪽`}
        />
        <div className='border-t border-line-soft'>
          <JourneyRow
            icon={<Star className='size-4' />}
            label='최고 평점 책'
            value={`${data.perfectScoreBooks}권`}
            description={`전체 기록의 ${data.perfectScoreRate}%`}
          />
        </div>
        <div className='border-t border-line-soft'>
          <JourneyRow
            icon={<Clock3 className='size-4' />}
            label='예상 독서 시간'
            value={`${data.estimatedHours.toLocaleString()}시간`}
            description={`약 ${data.estimatedDays}일의 독서`}
          />
        </div>
      </div>

      <p className='mt-4 flex items-center gap-2 text-xs text-text-faint'>
        <CalendarDays className='size-3.5' />
        {data.readingYears > 0
          ? `${data.readingYears}년 동안 이어온 기록입니다.`
          : '첫 완독부터 독서 여정이 시작됩니다.'}
      </p>
    </div>
  );
};
