'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import styles from './HomeTemplate.module.scss';

import BookList from '@components/book/BookList';
import Visual from '@components/home/Visual';
import useBooks from '@hooks/useBooks';
import Club from '@components/home/Club';
import { BannerSkeleton } from '@components/home/Banner';

const Banners = dynamic(() => import('@components/home/Banner'), {
  ssr: false,
  loading: () => <BannerSkeleton />,
});

export default function HomeTemplate() {
  const { data } = useBooks();

  return (
    <div>
      <Visual />

      <div className="max-width">
        <Banners />
        <Club />

        <main>
          <div className={styles.titleWrap}>
            <h2>인기 도서</h2>
            <Link href="/book">도서 더보기</Link>
          </div>
          {data && <BookList data={data.slice(0, 8)} />}
        </main>
      </div>
    </div>
  );
}
