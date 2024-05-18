'use client';
import { store } from '@firebase/firebaeApp';
import { Book } from '@models/Book';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export async function getBooks() {
  const bookQuery = query(
    collection(store, 'books'),
    orderBy('lastUpdatedTime', 'desc'),
  );

  const snapshot = await getDocs(bookQuery);
  const books = snapshot.docs.map((doc) => ({
    ...(doc.data() as Book),
  }));

  return books;
}

export default function useGetBookList() {
  const [data, setData] = useState<Book[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    try {
      setIsLoading(true);
      getBooks().then((data) => {
        setData(data);
      });
    } catch (error) {
      console.log('에러발생', error);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error };
}
