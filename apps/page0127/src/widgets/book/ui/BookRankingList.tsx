'use client';

import { Heart } from 'lucide-react';

import { BookListItem } from '@/widgets/book/ui/BookListItem';

import type { BookRanking } from '@/entities/book';

type BookRankingListProps = {
  title: string;
  subTitle?: string;
  books: BookRanking[];
  type: 'best' | 'most'; // best: 인생책 (Heart icon), most: 완독왕 (Book icon or simple count)
  myReadIsbns?: string[];
  myLikedIds?: string[];
};

export const BookRankingList = ({
  title,
  subTitle,
  books,
  type,
  myReadIsbns = [],
  myLikedIds = [],
}: BookRankingListProps) => {
  if (!books || books.length === 0) return null;

  return (
    <section className='py-8'>
      <div className='mb-6 flex items-end justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>{title}</h2>
          {subTitle && <p className='mt-1 text-gray-500'>{subTitle}</p>}
        </div>
      </div>

      <div className='grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
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
              />

              {/* Ranking specific stats below the item */}
              <div className='flex items-center justify-center gap-1 text-xs font-medium text-gray-500'>
                {type === 'best' ? (
                  <>
                    <Heart className='h-3 w-3 fill-red-500 text-red-500' />
                    <span>{item.count}명</span>
                  </>
                ) : (
                  <span>🔥 {item.count}회 완독</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
