import BookList from '@components/book/BookList';
import { Book } from '@connect/book';
import Link from 'next/link';
import { useMemo } from 'react';

export default function BookSection({
  title,
  books,
  count,
}: {
  title: string;
  books: Book[];
  count: number;
}) {
  const sliceBooks = useMemo(() => books.slice(0, count), [books, count]);
  if (!books.length) return null;

  return (
    <section className="section01">
      <div className="max-width">
        <h2 className="title2">{title}</h2>
        <BookList data={sliceBooks} />
        <Link href="/book" className="more">
          도서 더보기
        </Link>
      </div>
    </section>
  );
}
