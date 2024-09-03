'use client';
import BookList from '@components/book/BookList';
import Banners, { BannerSkeleton } from '@components/home/Banner';
import Visual from '@components/home/Visual';
import Link from 'next/link';
import { Suspense } from 'react';

import styles from './HomeTemplate.module.scss';
import useBooks from '@hooks/useBooks';
import withSuspense from '@components/shared/hocs/withSuspense';

function HomeTemplate() {
  const { data } = useBooks();
  return (
    <div>
      <Visual />
      <div className="max-width">
        <Suspense fallback={<BannerSkeleton />}>
          <Banners />
        </Suspense>
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

export default withSuspense(HomeTemplate, {
  fallback: <div>책 데이터를 불러오는 중...</div>,
});
