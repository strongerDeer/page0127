import BookList from '@components/book/BookList';
import Banners, { BannerSkeleton } from '@components/home/Banners';
import Visual from '@components/home/Visual';
import { Suspense } from 'react';

export default function Home() {
  return (
    <>
      <Visual />
      <div className="max-width">
        <Suspense fallback={<BannerSkeleton />}>
          <Banners />
        </Suspense>
        <main>
          <h2>인기 도서</h2>
          <BookList />
          <h2>인기 모임</h2>
          <h2>인기 리더</h2>
        </main>
      </div>
    </>
  );
}
