'use client';
import { useQuery, useQueryClient } from 'react-query';

import { useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { getBooks } from '@connect/book/books';

export default function useBooks() {
  const client = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(store, COLLECTIONS.BOOKS),
        orderBy('createdTime', 'desc'),
      ),
      (snapshot) => {
        const newBooks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        client.setQueryData(['books'], newBooks);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client]);

  return useQuery(['books'], () => getBooks(), { suspense: true });
}
