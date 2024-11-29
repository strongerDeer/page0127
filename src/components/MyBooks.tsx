'use client';

import Link from 'next/link';
import Image from 'next/image';

import useMyBooks from '@hooks/useMyBooks';
import { useEffect, useState } from 'react';

import styles from './MyBooks.module.scss';
import { Book } from '@connect/book';
import CategoryTab from './my/CategoryTab';

export default function MyBooks({
  userId,
  year,
}: {
  userId: string;
  year: string;
}) {
  const { data: book } = useMyBooks({ userId: userId });
  const [category, setCategory] = useState<string>('All');
  const [bookData, setBookData] = useState<Book[]>([]);
  const [imgSrc, setImgSrc] = useState<{ [key: string]: string }>({});

  const onError = (bookId: string) => {
    setImgSrc((prev) => ({
      ...prev,
      [bookId]: '/images/no-book.jpg',
    }));
  };

  useEffect(() => {
    if (!book) return;

    const yearFilteredBooks = book.filter(
      (book) =>
        book.readDate &&
        book.readDate > `${year}-01-01` &&
        book.readDate < `${year + 1}-01-01`,
    );

    let categoryFilteredBooks = yearFilteredBooks;

    if (category === '기타') {
      categoryFilteredBooks = yearFilteredBooks?.filter(
        (book) =>
          book.category !== '컴퓨터/모바일' &&
          book.category !== '소설/시/희곡' &&
          book.category !== '에세이' &&
          book.category !== '경제경영' &&
          book.category !== '인문학' &&
          book.category !== '자기계발',
      ) as Book[];
    } else if (category !== 'All') {
      categoryFilteredBooks = yearFilteredBooks?.filter(
        (book) => book.category === category,
      ) as Book[];
    }

    setBookData(categoryFilteredBooks);
  }, [year, book, category]);

  return (
    <div>
      <h3 className={styles.title}>읽은 책 ({book?.length})</h3>
      <CategoryTab
        value={category}
        setValue={setCategory}
        count={bookData?.length}
      />

      <div className={styles.shelf}>
        {bookData && bookData.length > 0 ? (
          <ul className={styles.books}>
            {bookData?.map((book) => (
              <li
                className={book.grade === '10' ? styles.best : ''}
                key={book.id}
              >
                <Link href={`/${userId}/${book.id}`}>
                  {book.id && (
                    <Image
                      src={
                        imgSrc[book.id] ||
                        (book.grade === '10' ? book.frontCover : book.flipCover)
                      }
                      alt={book.title}
                      width={170}
                      height={240}
                      sizes="(max-width: 768px) 170, 170"
                      onError={() => onError(book.id as string)}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div>등록된 책이 없어요</div>
        )}
      </div>
    </div>
  );
}
