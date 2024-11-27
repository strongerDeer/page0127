import dynamic from 'next/dynamic';
import { getMostReadBooks, getTopLifeBooks } from '@connect/book/books';
import { BannerSkeleton } from '@components/home/Banner';
import { VisualSkeleton } from '@components/home/Visual';
import { VideoSkeleton } from '@components/home/Video';

export const dynamicParams = false;
const Visual = dynamic(() => import('@components/home/Visual'), {
  loading: () => <VisualSkeleton />,
  ssr: true,
});
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
