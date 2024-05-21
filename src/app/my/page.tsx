'use client';

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@contexts/AuthContext';
import Image from 'next/image';
import Chart from '@components/Chart';
import Share from '@components/Share';

import styles from './page.module.scss';
import { Book } from '@models/Book';
export default function MyPage() {
  const { user, userBooks } = useContext(AuthContext);

  const [bookList2024, setBookList2024] = useState<Book[] | null>(null);
  const [bookList2023, setBookList2023] = useState<Book[] | null>(null);
  const [bookList2022, setBookList2022] = useState<Book[] | null>(null);
  const [bookListPrev, setBookListPrev] = useState<Book[] | null>(null);
  const [text, setText] = useState<string>('');

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

  useEffect(() => {
    if (user?.goals && bookList2024) {
      const monthBook = Number((user.goals / 12).toFixed(1));
      const thisMonth = new Date().getMonth() + 1;
      const diff = thisMonth * monthBook - bookList2024?.length;

      let text = '';
      if (bookList2024.length > user?.goals) {
        text = `목표를 달성했어요!\n목표보다 ${bookList2024.length - user?.goals}권 더 읽었어요!`;
      } else if (bookList2024.length === user?.goals) {
        text = `목표를 달성했어요! 좀 더 읽어볼까요?`;
      } else if (diff > 5) {
        text = `조금 더 달려볼까요? ${thisMonth}월 기준 ${diff}권 더 읽어야 목표 달성이 가능해요!`;
      } else if (diff <= 0) {
        text = `아주 잘하고 있어요! ${thisMonth}월 기준 ${Math.abs(diff)}권 넘게 읽고 있어요!`;
      } else {
        text = `조금만 더 ${diff}권 남았어요!`;
      }
      setText(text);
    }
  }, [user?.goals, bookList2024]);
  return (
    <>
      <label htmlFor="file">목표권수</label>
      <progress id="file" max={user?.goals} value={bookList2024?.length}>
        {user?.goals}
      </progress>
      {bookList2024?.length}/ {user?.goals}
      <p style={{ whiteSpace: 'pre' }}>{text}</p>
      {/* {user?.goals && (
        <p>
          한달에 약 {monthBook}권을 읽어야해요. {thisMonth}월 기준{' '}
          {thisMonth * monthBook}권을 읽었어야 해요!
        </p>
      )}
      {diff > 5 ? (
        <p>조금 더 달려볼까요? {diff}권 남았어요!</p>
      ) : diff <= 0 ? (
        <p>
          아주 잘하고 있어요! {thisMonth}월 기준 {Math.abs(diff)}권 넘게 읽고
          있어요!
        </p>
      ) : (
        <p>조금만 더 {diff}권 남았어요!</p>
      )} */}
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
            <div key={book.id} className={book.grade >= 5 ? styles.front : ''}>
              <Image
                src={book.grade >= 5 ? book.frontCover : book.flipCover}
                alt={book.title}
                width={100}
                height={100}
              />
            </div>
          ))}
        </div>
      )}
      {bookList2023 && bookList2023?.length > 0 && (
        <div className={styles.bookContainer}>
          {bookList2023.map((book) => (
            <div key={book.id} className={book.grade >= 5 ? styles.front : ''}>
              <Image
                src={book.grade >= 5 ? book.frontCover : book.flipCover}
                alt={book.title}
                width={100}
                height={100}
              />
            </div>
          ))}
        </div>
      )}
      {bookList2022 && bookList2022?.length > 0 && (
        <div className={styles.bookContainer}>
          {bookList2022.map((book) => (
            <div key={book.id} className={book.grade >= 5 ? styles.front : ''}>
              <Image
                src={book.grade >= 5 ? book.frontCover : book.flipCover}
                alt={book.title}
                width={100}
                height={100}
              />
            </div>
          ))}
        </div>
      )}
      {bookListPrev && bookListPrev?.length > 0 && (
        <div className={styles.bookContainer}>
          {bookListPrev.map((book) => (
            <div key={book.id} className={book.grade >= 5 ? styles.front : ''}>
              <Image
                src={book.grade >= 5 ? book.frontCover : book.flipCover}
                alt={book.title}
                width={100}
                height={100}
              />
            </div>
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
