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

const BookSections = dynamic(() => import('@components/home/BookSections'), {
  ssr: true,
  suspense: true,
});

const Search = dynamic(() => import('@components/home/Search'), {
  ssr: true,
});

const Video = dynamic(() => import('@components/home/Video'), {
  loading: () => <VideoSkeleton />,
  ssr: false,
});

export default async function HomePage() {
  const [topLifeBooks, mostReadBooks] = await Promise.all([
    getTopLifeBooks(),
    getMostReadBooks(),
  ]);
  return (
    <div>
      <Visual />

      <div className="max-width">
        <Suspense fallback={<BannerSkeleton />}>
          <Banner />
        </Suspense>
      </div>
      <main>
        <BookSections
          topLifeBooks={topLifeBooks}
          mostReadBooks={mostReadBooks}
        />
      </main>

      <Search />
      <Video />
    </div>
  );
}
