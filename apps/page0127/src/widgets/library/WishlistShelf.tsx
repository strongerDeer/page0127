import { BookGridItem } from '@/features/stats/ui/BookGridItem';

import type { Book } from '@/entities/book';

type WishlistShelfProps = {
  /** 읽고 싶은(want_to_read) 책 — 연도와 무관한 전체 위시리스트 */
  books: Book[];
  /** 책 클릭 시 이동할 URL 생성 함수 */
  bookHref: (book: Book) => string;
};

/**
 * 위시리스트(읽고 싶은 책) 렌더러
 *
 * 서재(완독·읽는 중)와 분리된 별도 탭의 본문이다.
 * - 완독 순번(BOOK #번호)·통계 없이 표지만 담백하게 나열한다.
 * - 표지 카드는 서재 그리드와 같은 BookGridItem을 재사용해 룩을 통일한다.
 */
export const WishlistShelf = ({ books, bookHref }: WishlistShelfProps) => {
  if (books.length === 0) {
    return (
      <div className='rounded-2xl bg-card p-12 text-center'>
        <p className='text-sm text-text-body'>
          아직 읽고 싶은 책이 없어요. 마음에 드는 책을 담아보세요.
        </p>
      </div>
    );
  }

  return (
    <section className='py-6'>
      <h3 className='mb-4 text-lg font-semibold text-text-strong'>
        읽고 싶은 책{' '}
        <span className='font-normal text-text-subtle'>{books.length}권</span>
      </h3>

      <div className='grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
        {books.map((book) => (
          <BookGridItem key={book.id} book={book} href={bookHref(book)} />
        ))}
      </div>
    </section>
  );
};
