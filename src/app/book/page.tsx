'use client';
import Loading from '@components/Loading';
import BookList from '@components/book/BookList';
import { SORT_OPTIONS, SortOption } from '@connect/book';
import useBooks from '@connect/book/useBooks';
import { ROUTES } from '@constants';

import { useInView } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const sortOptions = Object.values(SORT_OPTIONS);

export default function BookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSort =
    (searchParams.get('sort') as SortOption) || SORT_OPTIONS.POPULAR;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sortBy,
    setSortBy,
  } = useBooks(initialSort);

  const ref = useRef(null);
  const isInView = useInView(ref);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (isInView && hasNextPage && !isFetchingNextPage && !isLoadingMore) {
      setIsLoadingMore(true);
      // 1초 후에 다음 페이지 로드
      setTimeout(() => {
        fetchNextPage();
        setIsLoadingMore(false);
      }, 1000);
    }
  }, [isInView, hasNextPage, isFetchingNextPage, isLoadingMore, fetchNextPage]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as SortOption;
    setSortBy(newSort);

    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('sort', newSort);
    router.replace(`${ROUTES.BOOK}?${newSearchParams.toString()}`);
  };
  return (
    <main className="max-width">
      <div className="flex items-center justify-between">
        <h2 className="title2">도서</h2>
        <select
          value={sortBy}
          onChange={handleSortChange}
          className="w-[180px] p-2 border rounded-md"
        >
          {sortOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {data && <BookList data={data} />}

      <div ref={ref} className="h-60 flex items-center justify-center">
        {(isFetchingNextPage || isLoadingMore) && <Loading />}
      </div>
    </main>
  );
}
