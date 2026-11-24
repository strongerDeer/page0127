import { BookCheck, CalendarDays, Clock3, FileText, Star } from 'lucide-react';

import type { ReadingJourney } from '@/entities/book';

type Props = {
  data: ReadingJourney;
};

/**
 * 숫자 한 칸 — 이름 · 큰 숫자(+단위) · 보조 설명.
 * 칸끼리 같은 줄에 같은 높이로 서도록 세로 순서를 고정한다(이름 → 숫자 → 설명).
 */
const JourneyStat = ({
  icon,
  label,
  value,
  unit,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  description: string;
}) => (
  <div className='min-w-0'>
    <p className='flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-text-subtle sm:text-sm'>
      {icon}
      {label}
    </p>
    <p className='mt-2 whitespace-nowrap text-2xl font-bold tracking-[-0.04em] text-text-strong tabular-nums sm:text-3xl'>
      {value}
      <span className='ml-1 text-sm font-medium tracking-normal text-text-subtle'>
        {unit}
      </span>
    </p>
    <p className='mt-1 truncate text-xs text-text-subtle'>{description}</p>
  </div>
);

/**
 * 지금까지의 기록 — 누적 완독 · 읽은 쪽수 · 인생책 · 예상 독서 시간.
 *
 * 넓은 화면은 4칸 가로 줄, 좁은 화면은 2×2(HJ 시안 J1, 2026-11-24).
 * 예전 세로 목록은 연도별 추이 옆 1/3 폭에 맞춘 모양이었다. 전체 보기를 서재·기록·취향
 * 묶음으로 나누면서(#499) 이 카드가 전체 폭이 되자, 이름은 왼쪽 끝·숫자는 오른쪽 끝으로
 * 멀어져 읽기 어려웠다 → 이름과 숫자를 한 칸 안에 붙인다.
 */
export const ReadingJourneyCard = ({ data }: Props) => {
  const readingSince = data.readingSince
    ? new Date(data.readingSince).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
      })
    : null;

  return (
    <div>
      {/* 칸 사이 세로선은 넓은 화면(4칸)에서만 — 2×2 에서는 줄 간격으로 나눈다 */}
      <div className='grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-line-soft [&>*]:lg:px-6 [&>*:first-child]:lg:pl-0'>
        <JourneyStat
          icon={<BookCheck className='size-4' />}
          label='누적 완독'
          value={data.totalBooks.toLocaleString()}
          unit='권'
          // 첫 완독 전엔 "기록 시작 전부터"처럼 어색해지므로 날짜가 있을 때만
          description={readingSince ? `${readingSince}부터` : '기록 시작 전'}
        />
        <JourneyStat
          icon={<FileText className='size-4' />}
          label='읽은 쪽수'
          value={data.totalPages.toLocaleString()}
          unit='쪽'
          description={`하루 평균 ${data.averagePagesPerDay}쪽`}
        />
        <JourneyStat
          icon={<Star className='size-4' />}
          label='인생책'
          value={data.lifeBookCount.toLocaleString()}
          unit='권'
          description={`전체 기록의 ${data.lifeBookRate}%`}
        />
        <JourneyStat
          icon={<Clock3 className='size-4' />}
          label='예상 독서 시간'
          value={data.estimatedHours.toLocaleString()}
          unit='시간'
          description={`약 ${data.estimatedDays}일의 독서`}
        />
      </div>

      <p className='mt-6 flex items-center gap-2 border-t border-line-soft pt-4 text-xs text-text-subtle'>
        <CalendarDays className='size-3.5' />
        {data.readingYears > 0
          ? `${data.readingYears}년 동안 이어온 기록입니다.`
          : '첫 완독부터 독서 여정이 시작됩니다.'}
      </p>
    </div>
  );
};
