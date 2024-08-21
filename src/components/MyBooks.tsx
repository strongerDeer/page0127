'use client';

import Link from 'next/link';
import Image from 'next/image';

import useMyBooks from '@hooks/useMyBooks';
import { useState } from 'react';

import styles from './MyBooks.module.scss';

export default function MyBooks({ pageUid }: { pageUid: string }) {
  const { data: book } = useMyBooks({ userId: pageUid });

  const [imgSrc, setImgSrc] = useState<{ [key: string]: string }>({});

  const onError = (bookId: string) => {
    setImgSrc((prev) => ({
      ...prev,
      [bookId]: '/images/no-book.jpg',
    }));
  };
  return (
    <div className={styles.books}>
      {book?.map((book) => (
        <div className={book.grade === '10' ? styles.best : ''}>
          <Link href={`/shelf/${pageUid}/${book.id}`} key={book.id}>
            {book.id && (
              <Image
                src={
                  imgSrc[book.id] ||
                  (book.grade === '10' ? book.frontCover : book.flipCover)
                }
                alt=""
                width={240}
                height={240}
                onError={() => onError(book.id as string)}
              />
            )}
          </Link>
        </div>
      ))}
    </div>
  );
}
