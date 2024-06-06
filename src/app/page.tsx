import dynamic from 'next/dynamic';

import { BookListSkeleton } from '@components/BookList';
import Banners from '@components/Banners';

export default function Home() {
  return (
    <main>
      main
      {/* <Banners />
      <BookList /> */}
    </main>
  );
}

// const BookList = dynamic(() => import('@components/BookList'), {
//   ssr: false,
//   loading: () => <BookListSkeleton />,
// });
