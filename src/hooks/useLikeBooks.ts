import { useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import useUser from './auth/useUser';
import getBookLikes from '@remote/likeBook';

export default function useLikeBooks() {
  const userId = useUser()?.uid;
  const client = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(store, COLLECTIONS.BOOK_LIKE),
        where('likeUsers', 'array-contains', userId),
      ),
      (snapshot) => {
        const newBooks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        client.setQueryData(['likeBooks'], newBooks);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, userId]);

  const data = useQuery(
    ['likeBooks'],
    () => getBookLikes({ userId: userId as string }),
    {
      enabled: !!userId,
    },
  );

  return { data };
}
