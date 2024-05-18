import dynamic from 'next/dynamic';

import { BookListSkeleton } from '@components/BookList';

const BookList = dynamic(() => import('@components/BookList'), {
  ssr: false,
  loading: () => <BookListSkeleton />,
});

export default function Home() {
  return (
    <main>
      <BookList />
    </main>
  );
}
