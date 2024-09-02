import { useQuery, useQueryClient } from 'react-query';
import { getMyBooks } from '@remote/mybook';
import { useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';

export default function useMyBooks({ userId }: { userId: string }) {
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;

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
        client.setQueryData(['myBooks', userId], newBooks);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client]);

  return useQuery(['myBooks', userId], () => getMyBooks(userId), {
    enabled: !!userId,
  });
}
