import { useQuery, useQueryClient } from 'react-query';
import { getLikeBooks } from '@remote/book';
import { useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import useUser from './auth/useUser';

export default function useLikeBooks() {
  const userId = useUser()?.uid;
  const client = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(store, COLLECTIONS.BOOKS),
        where('likeUsers', 'array-contains', userId),
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
  }, [client, userId]);

  return useQuery(['books'], () => getLikeBooks(userId as string));
}
