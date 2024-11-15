import getFireBaseData from '@utils/getFirebaseData';
import { COLLECTIONS } from '@constants';
import Visual from '@components/home/Visual';
import Club from '@components/home/Club';
import Link from 'next/link';
import BookList from '@components/book/BookList';
import Banner from '@components/home/Banner';
import Search from '@components/home/Search';
import { Book } from '@connect/book';
import { orderBy } from 'firebase/firestore';
import Video from '@components/home/Video';

export default async function HomePage() {
  const topLifeBook = await getFireBaseData<Book>(COLLECTIONS.BOOKS, [
    orderBy('grade10Count', 'desc'),
    orderBy('readUserCount', 'desc'),
    orderBy('createdTime', 'desc'),
  ]);

  const mostReadBook = await getFireBaseData<Book>(COLLECTIONS.BOOKS, [
    orderBy('readUserCount', 'desc'),
    orderBy('createdTime', 'desc'),
  ]);
  return (
    <div>
      <Visual />
      <div className="max-width">
        <Banner />
        {/* <Club /> */}
      </div>
      <main>
        <section className="section01">
          <div className="max-width">
            <h2 className="title2">독자들이 선택한 인생책</h2>
            <BookList data={topLifeBook.slice(0, 4)} />
            <Link href="/book" className="more">
              도서 더보기
            </Link>
          </div>
        </section>

        <section className="section01">
          <div className="max-width">
            <h2 className="title2">가장 많이 읽힌 도서</h2>
            <BookList data={mostReadBook.slice(0, 8)} />
            <Link href="/book" className="more">
              도서 더보기
            </Link>
          </div>
        </section>
      </main>

      <Search />
      <Video />
    </div>
  );
}
