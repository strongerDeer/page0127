import dynamic from 'next/dynamic';
import Banners from '@components/Banners';

import { BookListSkeleton } from '@components/BookList';

export default function Home() {
  return (
    <main>


      <BookList />
    </main>
  );
}

const BookList = dynamic(() => import('@components/BookList'), {
  ssr: false,
  loading: () => <BookListSkeleton />,
});
