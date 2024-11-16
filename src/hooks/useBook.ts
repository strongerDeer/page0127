'use client';

import { useQuery, useQueryClient } from 'react-query';

import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { COLLECTIONS } from '@constants';
import { getBook } from '@connect/book/books';

export default function useBook({ id }: { id: string }) {
  const client = useQueryClient();

  useEffect(() => {
    if (id) {
      const unsubscribe = onSnapshot(
        doc(store, COLLECTIONS.BOOKS, id),
        (snapshot) => {
          const newBook = snapshot.data();
          client.setQueryData([`book-${id}`, id], newBook);
        },
      );
      return () => {
        unsubscribe();
      };
    }
  }, [id, client]);

  return useQuery([`book-${id}`, id], () => getBook(id), {
    enabled: !!id,
  });
}
