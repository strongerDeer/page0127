'use client';
import { getBook } from '@remote/book';
import { COLLECTIONS } from '@constants';
import { useQuery } from 'react-query';
import BookDetail from '@components/book/BookDetail';
import FixedBottomButton from '@components/FixedBottomButton';

export default function Page({ params }: { params: { id: string } }) {
  const { id = '' } = params;
  const { data } = useQuery([COLLECTIONS.BOOKS, id], () => getBook(id), {
    enabled: id !== '',
  });

  if (!data) {
    return null;
  }

  return (
    <div>
      <BookDetail data={data} />

      <FixedBottomButton text="신청" onClick={() => {}} />
    </div>
  );
}
