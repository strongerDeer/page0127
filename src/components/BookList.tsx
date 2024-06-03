'use client';

import { useInfiniteQuery } from 'react-query';
import { getBooks } from '@remote/book';

import { flatten } from 'lodash';
import InfiniteScroll from 'react-infinite-scroll-component';
import withSuspense from '@hooks/withSuspense';
import { Book } from '@models/Book';

import { Skeleton } from './Skeleton';
import BookListItem from './BookListItem';
import { COLLECTIONS } from '@constants';
import { useCallback } from 'react';

function BookList() {
  const {
    data,
    hasNextPage = false,
    fetchNextPage,
    isFetching,
  } = useInfiniteQuery(
    [COLLECTIONS.BOOKS],
    ({ pageParam }) => {
      return getBooks(pageParam);
    },
    {
      getNextPageParam: (snapshot) => {
        return snapshot.lastVisible;
      },
    },
  );

  const loadMore = useCallback(() => {
    if (hasNextPage === false || isFetching) {
      return;
    }
    fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetching]);

  if (data === null) {
    return null;
  }

  const books = flatten(data?.pages.map(({ data }) => data));

  return (
    <>
      {books && <>2024년 {books?.length}권</>}
      <InfiniteScroll
        dataLength={books.length}
        hasMore={hasNextPage}
        loader={<>Loading...</>}
        next={loadMore}
        scrollThreshold="100px"
      >
        <ul className="grid grid-cols-4 gap-16">
          {books.map((item: Book, index: number) => (
            <BookListItem key={item.id} index={index} {...item} />
          ))}
        </ul>
      </InfiniteScroll>
    </>
  );
}

export function BookListSkeleton() {
  return (
    <>
      {/* 2024년
      <ul className="grid grid-cols-4 gap-16">
        {[...new Array(5)].map((_, index) => (
          <li key={index}>
            <article className="flex flex-col gap-8 items-center">
              <div className="w-40 h-40 aspect-[1/2] flex justify-center">
                <Skeleton width="8rem" height="10rem" />
              </div>
              <div className="flex flex-col text-center gap-2">
                <Skeleton width="10rem" height="1em" />
                <Skeleton width="10rem" height="1em" />
              </div>
            </article>
          </li>
        ))}
      </ul> */}
    </>
  );
}

export default withSuspense(BookList, { fallback: <BookListSkeleton /> });
