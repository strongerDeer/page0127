'use client';
import { getBook } from '@remote/book';
import { COLLECTIONS } from '@constants';
import { useQuery } from 'react-query';
import BookDetail from '@components/book/BookDetail';

export default function Page({ params }: { params: { id: string } }) {
  const { id = '' } = params;

  const { data: book } = useQuery([COLLECTIONS.BOOKS, id], () => getBook(id), {
    enabled: id !== '',
  });

  if (!book) {
    return null;
  }

  return (
    <div>
      <BookDetail data={book} />
    </div>
  );
}
