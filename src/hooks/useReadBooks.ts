import { useQuery, useQueryClient } from 'react-query';
import { getBooks, getReadBooks } from '@remote/book';
import { useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import useUser from './auth/useUser';

export default function useReadBooks({ userId }: { userId: string }) {
  const client = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(store, COLLECTIONS.BOOKS),
        where('readUser', 'array-contains', userId),
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
  }, [client]);

  return useQuery(['readBooks'], () => getReadBooks(userId));
}
