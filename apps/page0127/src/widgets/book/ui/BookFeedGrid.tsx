import Image from 'next/image';
import Link from 'next/link';

import type { Book } from '@/entities/book';

type BookFeedGridProps = {
  /** 표시할 책 — 검색/필터가 적용된 목록 */
  books: Book[];
  /** 완독 순서 기준 번호 (book.id → 1부터 시작하는 순번). DashboardBookList가
   *  필터와 무관한 원본 목록 기준으로 미리 계산해 넘긴다 */
  rankMap: Map<string, number>;
  /** 책 클릭 시 이동할 URL 생성 함수 */
  bookHref: (book: Book) => string;
};

/**
 * 피드형 렌더러 — 표지 카드 그리드 + "BOOK #번호" 뱃지
 *
 * 학습 포인트:
 * - 번호는 이 컴포넌트가 계산하지 않는다. rankMap을 조회만 한다.
 *   그래야 검색/카테고리 필터를 걸어도 같은 책은 항상 같은 번호를 유지한다.
 * - 표지 없는 책의 fallback(제목 조판)은 BookGridItem과 동일한 패턴 —
 *   책장형/그리드형/피드형이 같은 "표지 없을 때" 규칙을 공유한다.
 */
export const BookFeedGrid = ({
  books,
  rankMap,
  bookHref,
}: BookFeedGridProps) => {
  if (books.length === 0) {
    return (
      <div className='rounded-2xl bg-sunken p-12 text-center'>
        <p className='text-text-body'>조건에 맞는 책이 없어요.</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'>
      {books.map((book) => {
        const rank = rankMap.get(book.id);

        return (
          <Link
            key={book.id}
            href={bookHref(book)}
            className='group transition-transform hover:scale-105'
          >
            <div className='aspect-2/3 relative overflow-hidden rounded-lg bg-muted'>
              {book.cover_image ? (
                <Image
                  src={book.cover_image}
                  alt={book.title}
                  fill
                  sizes='(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw'
                  className='object-cover'
                />
              ) : (
                <div className='flex h-full w-full flex-col justify-between bg-sunken px-2 py-2.5 text-left'>
                  <p className='line-clamp-4 break-keep text-[11px] font-bold leading-snug text-text-strong'>
                    {book.title}
                  </p>
                  {book.author && (
                    <p className='line-clamp-1 text-[10px] text-text-faint'>
                      {book.author}
                    </p>
                  )}
                </div>
              )}
              {rank !== undefined && (
                <div className='absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white'>
                  BOOK #{String(rank).padStart(3, '0')}
                </div>
              )}
            </div>
            <p className='mt-2 line-clamp-2 text-xs text-foreground group-hover:text-primary'>
              {book.title}
            </p>
          </Link>
        );
      })}
    </div>
  );
};
