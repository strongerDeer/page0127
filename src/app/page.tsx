import { getMostReadBooks, getTopLifeBooks } from '@connect/book/books';

import Visual from '@components/home/Visual';
import Banner from '@components/home/Banner';
import BookSection from '@components/home/BookSection';
import Search from '@components/home/Search';
import Video from '@components/home/Video';

export const dynamic = 'force-dynamic';

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
