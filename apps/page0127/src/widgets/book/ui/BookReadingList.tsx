import Link from 'next/link';

import { Lock } from 'lucide-react';

import { isRated } from '@/entities/book';

import type { BookReading } from '@/entities/book/api/getBookReadings';

type BookReadingListProps = {
  readings: BookReading[];

  /** 지금 보고 있는 기록의 id — 이 줄만 링크 대신 강조로 남긴다 */
  currentBookId: string;

  /** 회독 링크 계산용 */
  username: string;
};

/**
 * '이 책을 읽은 기록' — 같은 책의 회독을 한 줄씩 보여준다
 *
 * 책장은 회독을 한 권으로 합쳐 **최신 회독**만 링크한다. 그래서 옛 회독의
 * 평점·한줄평을 열어볼 길이 없어지는데, 이 목록이 그 길이다.
 *
 * 회독이 하나뿐이면 보여줄 게 없으므로 섹션을 통째로 숨긴다 — 대부분의 책은
 * 1회독이라, 늘 띄우면 의미 없는 줄이 모든 상세 페이지에 하나씩 붙는다.
 */
export const BookReadingList = ({
  readings,
  currentBookId,
  username,
}: BookReadingListProps) => {
  if (readings.length <= 1) return null;

  return (
    <section className='rounded-2xl bg-card p-6'>
      <h2 className='mb-1 text-base font-medium text-text-strong'>
        이 책을 읽은 기록{' '}
        <span className='font-normal text-text-subtle'>
          {readings.length}번
        </span>
      </h2>
      <p className='mb-4 text-sm text-text-subtle'>
        회독마다 평점과 한줄평을 따로 남길 수 있어요.
      </p>

      <ul className='divide-y divide-line-soft'>
        {readings.map((reading) => {
          const isCurrent = reading.id === currentBookId;

          const row = (
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1 py-3'>
              <span
                className={
                  isCurrent
                    ? 'font-medium text-primary'
                    : 'font-medium text-text-strong'
                }
              >
                {reading.read_count}회독
              </span>

              <span className='text-sm text-text-body'>
                {reading.completed_date ??
                  (reading.status === 'reading' ? '읽는 중' : '날짜 없음')}
              </span>

              {/* isRated: 0("평가 안 함")을 걸러낸다. 인생책은 점수가 아니라 이름으로 */}
              {isRated(reading.rating) && (
                <span className='text-sm text-text-body'>
                  {reading.is_life_book ? '인생책' : `${reading.rating}점`}
                </span>
              )}

              {!reading.is_public && (
                <span className='flex items-center gap-1 text-xs text-text-subtle'>
                  <Lock className='h-3 w-3' />
                  보관
                </span>
              )}

              {/* 한줄평보다 앞에 둔다 — 뒤에 두면 줄바꿈되는 한줄평에 밀려
                  어느 줄을 가리키는 표시인지 알아보기 어렵다 */}
              {isCurrent && (
                <span className='text-xs text-text-subtle'>지금 보는 기록</span>
              )}

              {reading.one_line_review && (
                <span className='w-full truncate text-sm text-text-subtle'>
                  “{reading.one_line_review}”
                </span>
              )}
            </div>
          );

          return (
            <li key={reading.id}>
              {isCurrent ? (
                row
              ) : (
                <Link
                  href={`/${username}/${reading.id}`}
                  className='block hover:bg-sunken'
                >
                  {row}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
