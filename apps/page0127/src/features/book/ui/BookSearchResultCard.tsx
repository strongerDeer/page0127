'use client';

import { Button } from '@repo/ui';
import { BookCover } from '@repo/ui';

import { upgradeImageResolution } from '@/shared/lib/imageUtils';

import type { AladinBook } from '@/entities/book';

type BookSearchResultCardProps = {
  book: AladinBook;
  onSelect: (book: AladinBook) => void;
};

/**
 * 도서 검색 결과 행
 *
 * 디자인:
 * - 검색 결과는 "고르는 면"이다 — 큰 카드 하나가 아니라 행 리스트로 훑게 한다
 *   (기존: 표지 크롭 + 저자 전체 나열 + 풀폭 버튼으로 결과 하나가 화면을 다 먹었다)
 * - 표지는 h-20, 판형은 크롭하지 않는다 (높이 고정, 너비 원본 비율)
 * - 필드 3줄: 제목 / 저자 / 출판사·출간일 — 나머지는 등록 폼에서 본다
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
    <article className='flex items-center gap-4 py-3.5'>
      <BookCover
        src={highResCover}
        title={book.title}
        decorative
          size='sm'
        />

      <div className='min-w-0 flex-1'>
        <h3 className='truncate text-base font-medium text-text-strong'>
          {book.title}
        </h3>
        <p className='mt-0.5 truncate text-sm text-text-subtle'>
          {book.author}
        </p>
        <p className='mt-1 truncate text-xs text-text-subtle'>
          {book.publisher}
          {book.pubDate && ` · ${book.pubDate}`}
        </p>
      </div>

      <Button
        size='sm'
        variant='outline'
        onClick={() => onSelect(book)}
        className='shrink-0'
      >
        추가
      </Button>
    </article>
  );
};
