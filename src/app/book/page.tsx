'use client';
import Loading from '@components/Loading';
import BookList from '@components/book/BookList';
import useBooks from '@hooks/useBooks';
import { useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sortBy,
    setSortBy,
  } = useBooks();

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
  return (
    <main className="max-width">
      <div className="flex items-center justify-between">
        <h2 className="title2">도서</h2>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="w-[180px] p-2 border rounded-md"
        >
          <option value="인기순">인기순</option>
          <option value="인생책순">인생책순</option>
          <option value="등록순">등록순</option>
          <option value="이름순">이름순</option>
          <option value="출시일순">출시일순</option>
        </select>
      </div>

      {data && <BookList data={data} />}

      <div ref={ref} className="h-60 flex items-center justify-center">
        {(isFetchingNextPage || isLoadingMore) && <Loading />}
      </div>
    </main>
  );
}
