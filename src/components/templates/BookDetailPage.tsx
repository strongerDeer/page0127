'use client';
import BookDetail from '@components/book/BookDetail';
import useBook from '@hooks/useBook';

export default function BookDetailPage({ bookId }: { bookId: string }) {
  const { data: book, isLoading } = useBook({ id: bookId });

  if (!book || isLoading) {
    return <>Loading...</>;
  }

  return (
    <div>
      <BookDetail data={book} />
    </div>
  );
}
