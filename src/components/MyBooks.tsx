'use client';

import Link from 'next/link';
import Image from 'next/image';

import useMyBooks from '@hooks/useMyBooks';
import { useEffect, useState } from 'react';

import styles from './MyBooks.module.scss';
import { Book } from '@connect/book';
import CategoryTab from './my/CategoryTab';
import YearTab from './my/YearTab';

export default function MyBooks({ pageUid }: { pageUid: string }) {
  const nowYear = String(new Date().getFullYear());
  const { data: book } = useMyBooks({ userId: pageUid });
  const latestBook = book?.filter(
    (book) => book.readDate && book.readDate > `${nowYear}-01-01`,
  ) as Book[];

  // 카테고리 , 연도별
  const [category, setCategory] = useState<string>('All');
  const [year, setYear] = useState<string>(nowYear);
  const [bookData, setBookData] = useState<Book[]>(latestBook);

  const [imgSrc, setImgSrc] = useState<{ [key: string]: string }>({});

  const onError = (bookId: string) => {
    setImgSrc((prev) => ({
      ...prev,
      [bookId]: '/images/no-book.jpg',
    }));
  };

  console.log(book);

  useEffect(() => {
    let filteredBook = book as Book[];
    if (year !== 'All') {
      filteredBook = book?.filter(
        (book) =>
          book.readDate &&
          book.readDate > `${year}-01-01` &&
          book.readDate < `${year + 1}-01-01`,
      ) as Book[];
    }
    if (category !== 'All') {
      filteredBook = book?.filter(
        (book) => book.category === category,
      ) as Book[];
    }

    setBookData(filteredBook);
  }, [year, book, category]);

  return (
    <div>
      <h2>{year}</h2>
      <YearTab value={year} setValue={setYear} />
      <CategoryTab value={category} setValue={setCategory} />

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
