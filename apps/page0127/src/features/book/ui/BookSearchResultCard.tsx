'use client';

import Image from 'next/image';

import { upgradeImageResolution } from '@/shared/lib/imageUtils';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';

import type { AladinBook } from '@/entities/book/types';

type BookSearchResultCardProps = {
  book: AladinBook;
  onSelect: (book: AladinBook) => void;
};

/**
 * 도서 검색 결과 카드 컴포넌트
 *
 * 학습 포인트:
 * - Next.js Image 컴포넌트 사용 (최적화)
 * - 조건부 렌더링
 * - Props로 이벤트 핸들러 전달
 */
export const BookSearchResultCard = ({
  book,
  onSelect,
}: BookSearchResultCardProps) => {
  // 고해상도 이미지 URL로 변환
  const highResCover = book.cover
    ? upgradeImageResolution(book.cover)
    : book.cover;

  return (
    <Card className='flex overflow-hidden'>
      {/* 책 표지 이미지 */}
      <div className='relative h-40 w-28 flex-shrink-0'>
        {highResCover ? (
          <Image
            src={highResCover}
            alt={book.title}
            fill
            className='object-cover'
            sizes='112px'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center bg-gray-200 text-gray-400'>
            No Image
          </div>
        )}
      </div>

      {/* 책 정보 */}
      <div className='flex flex-1 flex-col'>
        <CardHeader className='pb-3'>
          <h3 className='line-clamp-2 text-base font-semibold'>{book.title}</h3>
          <p className='text-sm text-gray-600'>{book.author}</p>
        </CardHeader>

        <CardContent className='flex-1 pt-0'>
          <div className='space-y-1 text-sm text-gray-500'>
            <p>출판사: {book.publisher}</p>
            <p>출간일: {book.pubDate}</p>
            {book.categoryName && (
              <p className='line-clamp-1'>카테고리: {book.categoryName}</p>
            )}
          </div>

          <Button
            onClick={() => onSelect(book)}
            className='mt-4 w-full'
            variant='outline'
          >
            이 책 추가하기
          </Button>
        </CardContent>
      </div>
    </Card>
  );
};
