import BookList from '@components/book/BookList';
import { Book } from '@connect/book';
import Link from 'next/link';

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
        <BookList data={books.slice(0, count)} />
        <Link href="/book" className="more">
          도서 더보기
        </Link>
      </div>
    </section>
  );
}
