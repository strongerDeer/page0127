import dynamic from 'next/dynamic';
import { BookListSkeleton } from '@components/book/BookList';

export default function Home() {
  return (
    <main>
      main
      <BookList />
    </main>
  );
}

const BookList = dynamic(() => import('@components/book/BookList'), {
  ssr: false,
  loading: () => <BookListSkeleton />,
});
