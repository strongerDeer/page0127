'use client';
import { useInfiniteQuery, useQuery, useQueryClient } from 'react-query';

import { useEffect, useState } from 'react';
import {
  collection,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
} from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { getBooks } from '@connect/book/books';
import { Book } from '@connect/book';

type SortOption = '인생책순' | '인기순' | '등록순' | '이름순' | '출시일순';

export default function useBooks(initialSort: SortOption = '이름순') {
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const client = useQueryClient();

  const getSortField = (sort: SortOption) => {
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
      default:
        return 'createdTime';
    }
  };

  const getSortDirection = (sort: SortOption) => {
    if (['등록순', '인생책순', '인기순'].includes(sort)) {
      return 'desc';
    }
    return 'asc';
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(store, COLLECTIONS.BOOKS),
        orderBy(getSortField(sortBy), getSortDirection(sortBy)),
        limit(12),
      ),
      (snapshot) => {
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
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, sortBy]);

  // 무한 스크롤
  const fetchBooks = async ({ pageParam = null }) => {
    let bookQuery = query(
      collection(store, COLLECTIONS.BOOKS),
      orderBy(getSortField(sortBy), getSortDirection(sortBy)),
      limit(12),
    );

    if (pageParam) {
      bookQuery = query(
        collection(store, COLLECTIONS.BOOKS),
        orderBy(getSortField(sortBy), getSortDirection(sortBy)),
        startAfter(pageParam),
        limit(12),
      );
    }

    const snapshot = await getDocs(bookQuery);
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return {
      items: snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Book),
      })),
      lastVisible,
    };
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(
      ['books', sortBy],
      ({ pageParam }) => fetchBooks({ pageParam }),
      {
        getNextPageParam: (lastPage) =>
          lastPage.items.length === 12 ? lastPage.lastVisible : undefined,
        suspense: true,
      },
    );

  return {
    data: data?.pages.flatMap((page) => page.items) ?? [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sortBy,
    setSortBy,
  };
  // return useQuery(['books'], () => getBooks(), { suspense: true });
}
