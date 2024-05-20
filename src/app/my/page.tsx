'use client';

import { useContext } from 'react';
import { AuthContext } from '@contexts/AuthContext';
import Image from 'next/image';
import Chart from '@components/Chart';
import Share from '@components/Share';

import styles from './page.module.scss';
export default function MyPage() {
  const { user, userBooks } = useContext(AuthContext);

  return (
    <>
      {userBooks && (
        <div className={styles.bookContainer}>
          {userBooks.map((book) => (
            <div key={book.id} className={book.grad >= 5 ? styles.front : ''}>
              <Image
                src={book.grad >= 5 ? book.frontCover : book.flipCover}
                alt={book.title}
                width={100}
                height={100}
              />
            </div>
          ))}
        </div>
      )}

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
      </div>
      <Share />
      <div className="w-1/3 m-auto">
        <Chart />
      </div>
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
