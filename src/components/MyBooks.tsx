'use client';

import Link from 'next/link';
import Image from 'next/image';

import useMyBooks from '@hooks/useMyBooks';

export default function MyBooks({ pageUid }: { pageUid: string }) {
  const { data: book } = useMyBooks({ userId: pageUid });

  return (
    <div className="flex gap-4">
      {book?.map((book) => (
        <Link href={`/shelf/${pageUid}/${book.id}`} key={book.id}>
          <Image src={book.flipCover} alt="" width={20} height={100} />
        </Link>
      ))}
    </div>
  );
}
