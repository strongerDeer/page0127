import { useQuery, useQueryClient } from 'react-query';
import { getBooks } from '@remote/book';
import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';

export default function useBooks() {
  const client = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(store, COLLECTIONS.BOOKS),
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
