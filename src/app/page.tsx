import dynamic from 'next/dynamic';

import { BookListSkeleton } from '@components/BookList';
import Banners from '@components/home/Banners';
import Visual from '@components/home/Visual';

export default function Home() {
  return (
    <>
      <Visual />
      <div className="max-width">
        <Banners />
        {/* <Banners />
      <BookList /> */}
        <main>main</main>
      </div>
    </>
  );
}

// const BookList = dynamic(() => import('@components/BookList'), {
//   ssr: false,
//   loading: () => <BookListSkeleton />,
// });
