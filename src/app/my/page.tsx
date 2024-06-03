'use client';

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@contexts/AuthContext';
import Image from 'next/image';
import Chart from '@components/Chart';
import Share from '@components/Share';

import styles from './page.module.scss';
import { Book } from '@models/Book';

import BookItem from '@components/BookItem';
import Goal from '@components/Goal';
export default function MyPage() {
  const { user, userBooks } = useContext(AuthContext);

  const [bookList2024, setBookList2024] = useState<Book[] | null>(null);
  const [bookList2023, setBookList2023] = useState<Book[] | null>(null);
  const [bookList2022, setBookList2022] = useState<Book[] | null>(null);
  const [bookListPrev, setBookListPrev] = useState<Book[] | null>(null);

  useEffect(() => {
    if (userBooks) {
      const data2024 = userBooks?.filter(
        (book) =>
          book.readDate.seconds >= new Date('2024-01-01').getTime() / 1000,
      );
      const data2023 = userBooks?.filter(
        (book) =>
          book.readDate.seconds >= new Date('2023-01-01').getTime() / 1000 &&
          book.readDate.seconds < new Date('2024-01-01').getTime() / 1000,
      );
      const data2022 = userBooks?.filter(
        (book) =>
          book.readDate.seconds >= new Date('2022-01-01').getTime() / 1000 &&
          book.readDate.seconds < new Date('2023-01-01').getTime() / 1000,
      );
      const dataPrev = userBooks?.filter(
        (book) =>
          book.readDate.seconds < new Date('2022-01-01').getTime() / 1000,
      );
      setBookList2024(data2024);
      setBookList2023(data2023);
      setBookList2022(data2022);
      setBookListPrev(dataPrev);
    }
  }, [userBooks]);

  return (
    <>
      {bookList2024?.length && <Goal bookLength={bookList2024.length} />}

      <div className="flex items-center ">
        <div>
          <Image
            src={user?.photoURL || ''}
            width="100"
            height="100"
            alt=""
            className="rounded-full"
          />
          <p>{user?.displayName}</p>
          <p>{user?.email}</p>
          <Share />
        </div>

        <div className="w-1/3 m-auto">
          <Chart />
        </div>
      </div>
      {bookList2024 && bookList2024?.length > 0 && (
        <div className={styles.bookContainer}>
          {bookList2024.map((book) => (
            <BookItem key={book.id} book={book} />
          ))}
        </div>
      )}
      {bookList2023 && bookList2023?.length > 0 && (
        <div className={styles.bookContainer}>
          {bookList2023.map((book) => (
            <BookItem key={book.id} book={book} />
          ))}
        </div>
      )}
      {bookList2022 && bookList2022?.length > 0 && (
        <div className={styles.bookContainer}>
          {bookList2022.map((book) => (
            <BookItem key={book.id} book={book} />
          ))}
        </div>
      )}
      {bookListPrev && bookListPrev?.length > 0 && (
        <div className={styles.bookContainer}>
          {bookListPrev.map((book) => (
            <BookItem key={book.id} book={book} />
          ))}
        </div>
      )}
    </>
  );
}

/*
"isbn=K872930470"

cover500/
k872930470_1.jpg

letslook/

S972930372_fl.jpg?RS=693&
Spine/
S852930376_d.jpg



spineflip/
S852930376_d.jpg


cover200/
k872930470_1.jpg

isbn: "K872930470"
isbn13: "9791197377143"
itemId: 33783 / 53 20


20000094


https://image.aladin.co.kr/product/33799/49/cover500/8901281791_3.jpg
https://image.aladin.co.kr/product/33799/49/spineflip/8901281791_d.jpg


https://image.aladin.co.kr/product/25629/18/cover200/k422735211_1.jpg
https://image.aladin.co.kr/product/25629/18/spineflip/k422735211_d.jpg

https://image.aladin.co.kr/product/33783/53/cover200/k872930470_1.jpg
https://image.aladin.co.kr/product/33783/53/spineflip/k872930470_d.jpg


*/
