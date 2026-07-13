import Link from 'next/link';

import { Heart } from 'lucide-react';

import { BookListItem } from '@/widgets/book/ui/BookListItem';

import type { BookRanking } from '@/entities/book';

type BookRankingListProps = {
  title: string;
  /** 집계 기준일 등 — 제목 우측에 붙는 메타 정보 */
  meta?: string;
  books: BookRanking[];
  type: 'best' | 'most';
  myReadIsbns?: string[];
  myLikedIds?: string[];
  isLoggedIn?: boolean;
};

export const BookRankingList = ({
  title,
  meta,
  books,
  type,
  myReadIsbns = [],
  myLikedIds = [],
  isLoggedIn = true,
}: BookRankingListProps) => {
  if (!books || books.length === 0) return null;

  return (
    <section>
      {/* 제목 + 기준일. 부제로 제목을 되풀이하지 않는다 */}
      <div className='mb-6 flex items-baseline justify-between gap-4'>
        <h2 className='heading-2 text-text-strong'>{title}</h2>
        <div className='flex shrink-0 items-baseline gap-3'>
          {meta && <span className='text-xs text-text-faint'>{meta}</span>}
          {isLoggedIn && (
            <Link
              href='/books/all'
              className='text-sm text-text-subtle transition-colors hover:text-text-strong'
            >
              전체보기
            </Link>
          )}
        </div>
      </div>

      <div className='grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
        {books.map((item, index) => {
          const book = item.book_info;
          const isRead = myReadIsbns.includes(book.isbn);
          const isLiked = myLikedIds.includes(book.id);

          return (
            <div key={item.isbn} className='flex flex-col gap-2'>
              <BookListItem
                book={book}
                rank={index + 1}
                isReadProp={isRead}
                isLikedProp={isLiked}
                isLoggedIn={isLoggedIn}
              />

              {/* 랭킹 수치 — 이모지(🔥) 대신 숫자를 앞세운다 */}
              <div className='flex items-center justify-center gap-1 text-xs text-text-subtle'>
                {type === 'best' ? (
                  <>
                    <Heart className='h-3 w-3 fill-rank-up text-rank-up' />
                    <span>
                      <b className='font-medium text-text-body'>{item.count}</b>
                      명이 10점
                    </span>
                  </>
                ) : (
                  <span>
                    <b className='font-medium text-text-body'>{item.count}</b>
                    명이 완독
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
