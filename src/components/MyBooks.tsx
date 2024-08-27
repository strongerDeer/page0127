'use client';

import Link from 'next/link';
import Image from 'next/image';

import useMyBooks from '@hooks/useMyBooks';
import { useEffect, useState } from 'react';

import styles from './MyBooks.module.scss';
import { Book } from '@models/book';

export default function MyBooks({ pageUid }: { pageUid: string }) {
  const { data: book } = useMyBooks({ userId: pageUid });

  const [imgSrc, setImgSrc] = useState<{ [key: string]: string }>({});

  const latestYear = String(new Date().getFullYear());

  const latestBook = book?.filter(
    (book) => book.readDate && book.readDate > `${latestYear}-01-01`,
  ) as Book[];

  const [activeYear, setActiveYear] = useState<string>(latestYear);
  const [bookData, setBookData] = useState<Book[]>(latestBook);

  const onError = (bookId: string) => {
    setImgSrc((prev) => ({
      ...prev,
      [bookId]: '/images/no-book.jpg',
    }));
  };

  useEffect(() => {
    let filteredBook = book as Book[];
    if (activeYear !== '전체') {
      filteredBook = book?.filter(
        (book) =>
          book.readDate &&
          book.readDate > `${activeYear}-01-01` &&
          book.readDate < `${activeYear + 1}-01-01`,
      ) as Book[];
    }

    setBookData(filteredBook);
  }, [activeYear, book]);

  const handleYear = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.textContent;
    if (value) {
      setActiveYear(value);
    }
  };
  return (
    <div>
      <ul className="flex gap-4">
        <li>
          <button type="button" onClick={handleYear}>
            {latestYear}
          </button>
        </li>
        <li>
          <button type="button" onClick={handleYear}>
            {Number(latestYear) - 1}
          </button>
        </li>
        <li>
          <button type="button" onClick={handleYear}>
            {Number(latestYear) - 2}
          </button>
        </li>
        <li>
          <button type="button" onClick={handleYear}>
            전체
          </button>
        </li>
      </ul>
      <h2>{activeYear} 읽은 도서</h2>
      {bookData && bookData.length > 0 ? (
        <div className={styles.books}>
          {bookData?.map((book) => (
            <div
              className={book.grade === '10' ? styles.best : ''}
              key={book.id}
            >
              <Link href={`/shelf/${pageUid}/${book.id}`}>
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
      ) : (
        <div>등록된 책이 없어요</div>
      )}
    </div>
  );
}
