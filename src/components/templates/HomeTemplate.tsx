'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import styles from './HomeTemplate.module.scss';

import BookList from '@components/book/BookList';
import Visual from '@components/home/Visual';
import useBooks from '@hooks/useBooks';
const Banners = dynamic(() => import('@components/home/Banner'), {
  ssr: false,
});

export default function HomeTemplate() {
  const { data } = useBooks();
  return (
    <div>
      <Visual />
      <div className="max-width">
        <Banners />
        <main>
          <div className={styles.titleWrap}>
            <h2>인기 도서</h2>
            <Link href="/book">도서 더보기</Link>
          </div>
          {data && <BookList data={data} />}
        </main>
      </div>
    </div>
  );
}
