import BookList from '@components/book/BookList';
import { Book } from '@connect/book';
import { ROUTES } from '@constants';
import Link from 'next/link';
import { useMemo } from 'react';
import ResponsiveBookSection from './ResponsiveBookSection';

export default function BookSection({
  title,
  books,
  count,
}: {
  title: string;
  books: Book[];
  count: number;
}) {
  return (
    <section className="section01">
      <div className="max-width">
        <h2 className="title2">{title}</h2>

        <ResponsiveBookSection books={books} maxCount={count} />
        <Link
          href={`${ROUTES.BOOK}?sort=${encodeURIComponent(title.includes('인생책') ? '인생책순' : '인기순')}`}
          className="more"
        >
          도서 더보기
        </Link>
      </div>
    </section>
  );
}
