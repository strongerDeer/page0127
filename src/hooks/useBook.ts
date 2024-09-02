'use client';

import { useQuery, useQueryClient } from 'react-query';
import { getBook } from '@remote/book';

import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { COLLECTIONS } from '@constants';

export default function useBook({ id }: { id: string }) {
  const client = useQueryClient();

  useEffect(() => {
    if (id) {
      const unsubscribe = onSnapshot(
        doc(store, COLLECTIONS.BOOKS, id),
        (snapshot) => {
          const newBook = snapshot.data();
          client.setQueryData(['book', id], newBook);
        },
      );
      return () => {
        unsubscribe();
      };
    }
  }, [id, client]);

  return useQuery(['book', id], () => getBook(id), {
    enabled: !!id,
  });
}
