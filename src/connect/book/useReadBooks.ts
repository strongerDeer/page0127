import { useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  startAt,
  getDocs,
} from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { Book } from '@connect/book';

const BOOKS_PER_PAGE = 12;

type SortOption = '등록순' | '이름순' | '출시일순';

interface ReadBooksResponse {
  items: Book[];
  total: number;
}

export default function useReadBooks({
  userId,
  page = 1,
  sortBy = '등록순',
}: {
  userId: string;
  page: number;
  sortBy: SortOption;
}) {
  const client = useQueryClient();
  const getSortField = (sort: SortOption) => {
    switch (sort) {
      case '이름순':
        return 'title';
      case '출시일순':
        return 'pubDate';
      default:
        return 'readDate';
    }
  };

  const getSortDirection = (sort: SortOption) => {
    return sort === '이름순' ? 'asc' : 'desc';
  };

  useEffect(() => {
    if (!userId) return;

    const bookQuery = query(
      collection(store, `${COLLECTIONS.USER}/${userId}/book`),
      orderBy(getSortField(sortBy), getSortDirection(sortBy)),
    );

    const unsubscribe = onSnapshot(bookQuery, async (snapshot) => {
      const allBooks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Book[];

      const startIndex = (page - 1) * BOOKS_PER_PAGE;
      const endIndex = startIndex + BOOKS_PER_PAGE;
      const paginatedBooks = allBooks.slice(startIndex, endIndex);

      client.setQueryData<ReadBooksResponse>(
        ['readBooks', userId, page, sortBy],
        {
          items: paginatedBooks,
          total: allBooks.length,
        },
      );
    });

    return () => {
      unsubscribe();
    };
  }, [client, userId, page, sortBy]);

  return useQuery<ReadBooksResponse>(
    ['readBooks', userId, page, sortBy],
    async () => {
      if (!userId) {
        return { items: [], total: 0 };
      }

      const bookQuery = query(
        collection(store, `${COLLECTIONS.USER}/${userId}/book`),
        orderBy(getSortField(sortBy), getSortDirection(sortBy)),
      );

      const snapshot = await getDocs(bookQuery);
      const allBooks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Book[];

      const startIndex = (page - 1) * BOOKS_PER_PAGE;
      const endIndex = startIndex + BOOKS_PER_PAGE;
      const paginatedBooks = allBooks.slice(startIndex, endIndex);

      return {
        items: paginatedBooks,
        total: allBooks.length,
      };
    },
    {
      enabled: !!userId,
      initialData: () =>
        client.getQueryData(['readBooks', userId, page, sortBy]),
    },
  );
}
