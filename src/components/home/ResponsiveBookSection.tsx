'use client';

import BookList from '@components/book/BookList';
import { Book } from '@connect/book';
import useWindowSize from '@hooks/useWindowSize';
import { useMemo } from 'react';

export default function ResponsiveBookSection({
  books,
  maxCount,
}: {
  books: Book[];
  maxCount: number;
}) {
  const { width } = useWindowSize();

  const responsiveCount = useMemo(() => {
    if (width < 640) return 2 * (maxCount / 4);
    if (width < 1200) return 3 * (maxCount / 4);
    return maxCount;
  }, [width, maxCount]);

  const sliceBooks = useMemo(
    () => books.slice(0, responsiveCount),
    [books, responsiveCount],
  );
  return (
    <div>
      <BookList data={sliceBooks} />
    </div>
  );
}
