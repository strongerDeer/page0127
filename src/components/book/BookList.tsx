'use client';

import flatten from 'lodash.flatten';
import InfiniteScroll from 'react-infinite-scroll-component';
import withSuspense from '@hooks/withSuspense';
import { Book } from '@models/book';

import BookListItem from './BookListItem';
import { motion } from 'framer-motion';
import { Skeleton } from '@components/shared/Skeleton';
import useBooks from './useBooks';
import useBookLike from '@hooks/useBookLike';
import { LikeBook } from '@models/likeBook';

function BookList() {
  const { data, hasNextPage, loadMore } = useBooks();
  const { data: bookLikes, mutate: bookLike } = useBookLike();

  if (data === null || bookLikes === null) {
    return null;
  }

  const books = flatten(data?.pages.map(({ data }) => data));

  return (
    <>
      {books && <>2024년 {books?.length}권</>}
      <InfiniteScroll
        dataLength={books.length}
        hasMore={hasNextPage}
        loader={!hasNextPage && <>Loading...</>}
        next={loadMore}
        scrollThreshold="100px"
      >
        <ul className="grid grid-cols-4 gap-16">
          {books.map((item: Book, index: number) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, translateY: '20%' }}
              animate={{ opacity: 1, translateY: '0%' }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <BookListItem
                index={index}
                bookLikes={bookLikes as LikeBook[]}
                bookLike={bookLike}
                {...item}
              />
            </motion.li>
          ))}
        </ul>
      </InfiniteScroll>
    </>
  );
}

export function BookListSkeleton() {
  return (
    <>
      2024년
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
      </ul>
    </>
  );
}

export default withSuspense(BookList, { fallback: <BookListSkeleton /> });
