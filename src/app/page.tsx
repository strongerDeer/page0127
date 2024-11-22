import { getMostReadBooks, getTopLifeBooks } from '@connect/book/books';

import Visual from '@components/home/Visual';

import BookSection from '@components/home/BookSection';
import Search from '@components/home/Search';
import { BannerSkeleton } from '@components/home/Banner';
import dynamic from 'next/dynamic';
import Video from '@components/home/Video';

export const dynamicParams = false;

const Banner = dynamic(() => import('@components/home/Banner'), {
  loading: () => <BannerSkeleton />,
  ssr: true,
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
        <Banner />
      </div>
      <main>
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
      </main>

      <Search />
      <Video />
    </div>
  );
}
