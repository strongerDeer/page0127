import dynamic from 'next/dynamic';

import { BookListSkeleton } from '@components/BookList';
import Banners from '@components/Banners';

const BookList = dynamic(() => import('@components/BookList'), {
  ssr: false,
  loading: () => <BookListSkeleton />,
});

export default function Home() {
  return (
    <main>
      <Banners />
      <BookList />
    </main>
  );
}
