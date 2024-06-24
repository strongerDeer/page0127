'use client';
import { COLLECTIONS } from '@constants';
import { getMyBooks } from '@remote/mybook';
import { useQuery } from 'react-query';
import Image from 'next/image';

export default function MyBooks({ pageUid }: { pageUid: string }) {
  const { data: book } = useQuery([COLLECTIONS.BOOKS], () =>
    getMyBooks(pageUid),
  );

  return (
    <div>
      {book?.map((book) => (
        <>
          <Image src={book.flipCover} alt="" width={20} height={100} />
        </>
      ))}
    </div>
  );
}
