import { useInfiniteQuery } from 'react-query';
import { getBooks } from '@remote/book';
import { useCallback } from 'react';

export default function useBooks() {
  const {
    data,
    hasNextPage = false,
    fetchNextPage,
    isFetching,
  } = useInfiniteQuery(
    ['books'],
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

  return { data, hasNextPage, isFetching, loadMore };
}
