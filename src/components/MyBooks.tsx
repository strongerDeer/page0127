'use client';

import Link from 'next/link';
import Image from 'next/image';

import { useQuery } from 'react-query';
import { getMyBooks } from '@remote/mybook';

export default function MyBooks({ pageUid }: { pageUid: string }) {
  const { data: book } = useQuery(['myBooks'], () => getMyBooks(pageUid));

  return (
    <div>
      <div className="flex">
        {book?.map((book) => (
          <Link href={`/shelf/${pageUid}/${book.id}`} key={book.id}>
            <Image src={book.flipCover} alt="" width={20} height={100} />
          </Link>
        ))}
      </div>
    </div>
  );
}
