'use client';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaeApp';
import { Book } from '@models/Book';
import {
  QuerySnapshot,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

// pageParam: 지금 보이고 있는 맨 마지막 요소
export async function getBooks(pageParam?: QuerySnapshot<Book>) {
  console.log(pageParam);
  const bookQuery = !pageParam
    ? query(
        collection(store, COLLECTIONS.BOOKS),
        orderBy('lastUpdatedTime', 'desc'),
        limit(10),
      )
    : query(
        collection(store, COLLECTIONS.BOOKS),
        orderBy('lastUpdatedTime', 'desc'),
        startAfter(pageParam),
        limit(10),
      );

  const snapshot = await getDocs(bookQuery);

  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  const books = snapshot.docs.map((doc) => ({
    ...(doc.data() as Book),
  }));

  return { books, lastVisible };
}

export default function useGetBookList(pageParam?: QuerySnapshot<Book>) {
  const [data, setData] = useState<Book[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    try {
      setIsLoading(true);
      getBooks(pageParam).then((data) => {
        setData(data);
      });
    } catch (error) {
      console.log('에러발생', error);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [pageParam]);

  return { data, isLoading, error };
}
