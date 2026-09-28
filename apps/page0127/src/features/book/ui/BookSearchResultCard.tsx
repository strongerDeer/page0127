'use client';

import { BookCover, Button } from '@repo/ui';

import type { ProviderBook } from '@/entities/book';

type BookSearchResultCardProps = {
  book: ProviderBook;
  onSelect: (book: ProviderBook) => void;
};

/**
 * 도서 검색 결과 행
 *
 * 디자인:
 * - 검색 결과는 "고르는 면"이다 — 큰 카드 하나가 아니라 행 리스트로 훑게 한다
 *   (기존: 표지 크롭 + 저자 전체 나열 + 풀폭 버튼으로 결과 하나가 화면을 다 먹었다)
 * - 표지는 h-20, 판형은 크롭하지 않는다 (높이 고정, 너비 원본 비율)
 * - 필드: 제목 / (부제) / 저자 / 출판사·출간일 — 나머지는 등록 폼에서 본다
 * - 부제는 저자보다 한 단계 작게 둔다. 제목 덩어리로 묶어 읽히되 저자 줄과
 *   경쟁하지 않게 하려는 것이다. 부제가 없으면 줄 자체가 사라진다
 *   (알라딘에서 온 책은 부제가 제목에 합쳐져 있어 항상 없다).
 */
export const BookSearchResultCard = ({
  book,
  onSelect,
}: BookSearchResultCardProps) => {
  return (
    <article className='flex items-center gap-4 py-3.5'>
      <BookCover
        src={book.coverImage}
        title={book.title}
        decorative
        size='sm'
      />

      <div className='min-w-0 flex-1'>
        <h3 className='truncate text-base font-medium text-text-strong'>
          {book.title}
        </h3>
        {book.subTitle && (
          <p className='mt-0.5 truncate text-xs text-text-subtle'>
            {book.subTitle}
          </p>
        )}
        <p className='mt-0.5 truncate text-sm text-text-subtle'>{book.author}</p>
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
