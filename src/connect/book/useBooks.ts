'use client';
import { useInfiniteQuery, useQueryClient } from 'react-query';

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
} from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { Book, SortOption } from '@connect/book';

const ITEMS_PER_PAGE = 12;

export default function useBooks(initialSort: SortOption = '인생책순') {
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const client = useQueryClient();

  const getSortField = useCallback((sort: SortOption) => {
    switch (sort) {
      case '인생책순':
        return 'grade10Count';
      case '인기순':
        return 'readUserCount';
      case '등록순':
        return 'lastUpdatedTime';
      case '이름순':
        return 'title';
      case '출시일순':
        return 'pubDate';
    }
  }, []);

  const getSortDirection = useCallback((sort: SortOption) => {
    if (['이름순'].includes(sort)) {
      return 'asc';
    }
    return 'desc';
  }, []);
  const createBookQuery = useCallback(
    (sortBy: SortOption, pageParam: any = null) => {
      const baseQuery = [
        orderBy(getSortField(sortBy), getSortDirection(sortBy)),
        limit(ITEMS_PER_PAGE),
      ];
      return query(
        collection(store, COLLECTIONS.BOOKS),
        ...baseQuery,
        ...(pageParam ? [startAfter(pageParam)] : []),
      );
    },
    [getSortField, getSortDirection],
  );

  useEffect(() => {
    const unsubscribe = onSnapshot(createBookQuery(sortBy), (snapshot) => {
      if (snapshot.empty) return;

      const newBooks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      //첫 페이지 데이터만 업데이트
      client.setQueryData(['books', sortBy], (old: any) => ({
        pages: [
          {
            items: newBooks,
            lastVisible: snapshot.docs[snapshot.docs.length - 1],
          },
        ],
        pageParams: [null],
      }));
    });
    return () => {
      unsubscribe();
    };
  }, [client, sortBy, createBookQuery]);

  // 무한 스크롤
  const fetchBooks = async ({ pageParam = null }) => {
    let bookQuery = createBookQuery(sortBy, pageParam);
    const snapshot = await getDocs(bookQuery);

    if (snapshot.empty) {
      return { items: [], lastVisible: null };
    }

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return {
      items: snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Book),
      })),
      lastVisible,
    };
  };

  const handleSortChange = useCallback(
    (newSort: SortOption) => {
      setSortBy(newSort);
      client.resetQueries(['books', newSort]);
    },
    [client],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(
      ['books', sortBy],
      ({ pageParam }) => fetchBooks({ pageParam }),
      {
        getNextPageParam: (lastPage) =>
          lastPage.items.length === ITEMS_PER_PAGE
            ? lastPage.lastVisible
            : undefined,
        suspense: true,
      },
    );

  return {
    data: data?.pages.flatMap((page) => page.items) ?? [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sortBy,
    setSortBy: handleSortChange,
  };
}
