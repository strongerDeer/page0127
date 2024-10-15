import { useQuery, useQueryClient } from 'react-query';

import { useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { getReadBooks } from '@connect/book/books';

export default function useReadBooks({ userId }: { userId: string }) {
  const client = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(store, `${COLLECTIONS.USER}/${userId}/book`),
        orderBy('readDate', 'desc'),
      ),
      (snapshot) => {
        const newBooks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        client.setQueryData(['readBooks'], newBooks);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, userId]);

  return useQuery(['readBooks'], () => getReadBooks(userId));
}
