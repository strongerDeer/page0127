'use client';

import Link from 'next/link';
import Image from 'next/image';

import useMyBooks from '@hooks/useMyBooks';
import { useEffect, useState } from 'react';

import styles from './MyBooks.module.scss';
import { Book } from '@models/book';
import Select from './form/Select';

export default function MyBooks({ pageUid }: { pageUid: string }) {
  const { data: book } = useMyBooks({ userId: pageUid });

  const [imgSrc, setImgSrc] = useState<{ [key: string]: string }>({});

  const latestYear = String(new Date().getFullYear());

  const latestBook = book?.filter(
    (book) => book.readDate && book.readDate > `${latestYear}-01-01`,
  ) as Book[];

  const [activeYear, setActiveYear] = useState<string>(latestYear);
  const [activeCategory, setActiveCategory] = useState<string>('전체');
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
    if (activeCategory !== '전체') {
      filteredBook = book?.filter(
        (book) => book.category === activeCategory,
      ) as Book[];
    }

    setBookData(filteredBook);
  }, [activeYear, book, activeCategory]);

  return (
    <div>
      <Select
        label="점수"
        options={[
          { value: '전체', label: '전체' },
          { value: latestYear.toString(), label: `${latestYear}` },
          {
            value: (Number(latestYear) - 1).toString(),
            label: `${Number(latestYear) - 1}`,
          },
          {
            value: (Number(latestYear) - 2).toString(),
            label: `${Number(latestYear) - 2}`,
          },
        ]}
        value={activeYear}
        onChange={setActiveYear}
        id="year"
        name="year"
      />
      <ul className="flex gap-4">
        <li>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('소설/시/희곡');
            }}
          >
            소설/시/희곡
          </button>
        </li>
        <li>
          <button type="button" onClick={() => {}}>
            {Number(latestYear) - 1}
          </button>
        </li>
        <li>
          <button type="button" onClick={() => {}}>
            {Number(latestYear) - 2}
          </button>
        </li>
        <li>
          <button type="button" onClick={() => {}}>
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
