import Link from 'next/link';

import { BookCover } from '@repo/ui';

import { toCoverSource } from '@/entities/book';

import type { Book, RatingReadingData } from '@/entities/book';
import type { RatingFilter } from '@/features/stats/model/useLibraryFilters';

type RatingSummaryCardProps = {
  year: number;
  ratings: RatingReadingData[];
  averageRating: number;
  total: number;
  /** 그 해 인생책 — 앞 3권만 그린다 */
  lifeBooks: Book[];
  bookHref: (book: Book) => string;
  /** 행 클릭 → 책장 평점 필터 (기존 동작) */
  onRatingClick: (rating: RatingFilter) => void;
};

/** ⑥ 오른쪽 — 평점 분포를 작게, 그 해 인생책을 표지로 강조 */
export const RatingSummaryCard = ({
  year,
  ratings,
  averageRating,
  total,
  lifeBooks,
  bookHref,
  onRatingClick,
}: RatingSummaryCardProps) => {
  // 0점 = "평가 안 함" — 분포에서 뺀다 (model/rating.ts 와 같은 규칙)
  const rows = ratings.filter((r) => r.is_life_book || r.rating > 0);
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <section className='flex flex-col gap-4 rounded-2xl border border-line-soft bg-card p-5'>
      <div className='flex items-baseline justify-between'>
        <h3 className='text-base font-bold text-text-strong'>평점 분포</h3>
        <span className='text-xs text-text-subtle'>
          평균 {averageRating > 0 ? averageRating.toFixed(1) : '—'} · {total}권
        </span>
      </div>

      {/* 평가한 책이 없으면 0 막대 여섯 줄을 그리지 않는다 — 빈 성적표처럼 읽힌다 */}
      {rows.every((row) => row.count === 0) ? (
        <p className='rounded-xl bg-sunken px-4 py-6 text-center text-sm text-text-subtle'>
          {year}년에 평가한 책이 생기면 분포가 그려져요
        </p>
      ) : (
        <ul className='space-y-1.5 text-xs'>
          {rows.map((row) => {
            const label = row.is_life_book ? '인생책' : `${row.rating}점`;
            return (
              <li key={label}>
                <button
                  type='button'
                  onClick={() =>
                    onRatingClick(row.is_life_book ? 'life' : row.rating)
                  }
                  className='grid w-full grid-cols-[48px_1fr_20px] items-center gap-2 text-left hover:text-primary'
                >
                  <span className='text-text-body'>{label}</span>
                  <span className='h-2 overflow-hidden rounded-full bg-sunken'>
                    <span
                      className='block h-full rounded-full'
                      style={{
                        width: `${(row.count / max) * 100}%`,
                        // 인생책은 틸 — 브랜드 블루와 어울리는 에메랄드 계열(책장 표지 보기 뱃지와 같은 색)
                        backgroundColor: row.is_life_book
                          ? 'var(--chart-6)'
                          : 'var(--chart-1)',
                      }}
                    />
                  </span>
                  <span className='text-right text-text-strong'>
                    {row.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {lifeBooks.length > 0 && (
        <div className='rounded-xl bg-sunken p-3'>
          <p className='mb-2 text-xs text-text-subtle'>{year} 인생책</p>
          <ul className='flex gap-3'>
            {lifeBooks.slice(0, 3).map((book) => (
              <li key={book.id} className='min-w-0 flex-1'>
                <Link
                  href={bookHref(book)}
                  className='flex items-center gap-2 hover:text-primary'
                >
                  <BookCover
                    {...toCoverSource(book)}
                    title={book.title}
                    decorative
                    size='xs'
                  />
                  <span className='line-clamp-2 text-sm font-medium text-text-strong'>
                    {book.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
