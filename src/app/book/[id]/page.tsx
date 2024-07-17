'use client';
import BookDetail from '@components/book/BookDetail';
import useBook from '@components/book/useBook';

export default function Page({ params }: { params: { id: string } }) {
  const { id = '' } = params;

  const { data: book, isLoading } = useBook({ id });

  if (!book || isLoading) {
    return <>Loading...</>;
  }

  return (
    <div>
      <BookDetail data={book} />
    </div>
  );
}
