import dynamic from 'next/dynamic';
import { BannerSkeleton } from '@components/home/Banner';
import { VideoSkeleton } from '@components/home/Video';
import { Visual } from '@components/home/Visual';
import { Suspense } from 'react';
import { getMostReadBooks, getTopLifeBooks } from '@connect/book/books';

export const dynamicParams = false;

const Banner = dynamic(() => import('@components/home/Banner'), {
  loading: () => <BannerSkeleton />,
  ssr: true,
});

const BookSection = dynamic(() => import('@components/home/BookSection'), {
  ssr: true,
});

const Search = dynamic(() => import('@components/home/Search'), {
  ssr: true,
});

const Video = dynamic(() => import('@components/home/Video'), {
  loading: () => <VideoSkeleton />,
  ssr: false,
});

export default async function HomePage() {
  return (
    <div>
      <Visual />

      <div className="max-width">
        <Suspense fallback={<BannerSkeleton />}>
          <Banner />
        </Suspense>
      </div>
      <main>
        {/* @ts-expect-error Async Component */}
        <BookSections />
      </main>

      <Search />
      <Video />
    </div>
  );
}

async function BookSections() {
  const [topLifeBooks, mostReadBooks] = await Promise.all([
    getTopLifeBooks(),
    getMostReadBooks(),
  ]);
  return (
    <>
      <BookSection
        title="독자들이 선택한 인생책"
        books={topLifeBooks}
        count={4}
      />
      <BookSection
        title="가장 많이 읽힌 도서"
        books={mostReadBooks}
        count={8}
      />
    </>
  );
}
