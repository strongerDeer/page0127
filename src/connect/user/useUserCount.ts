import { useQuery, useQueryClient } from 'react-query';
import useUser from './useUser';
import { useEffect } from 'react';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import getUserCount from './user';
import { COLLECTIONS } from '@constants';

export default function useUserCount(userId: string, year: string) {
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(
      doc(collection(store, `${COLLECTIONS.USER}/${userId}/total`), year),
      (snapshot) => {
        const newData = snapshot.data();
        client.setQueryData(['total'], newData);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, userId]);

  return useQuery(['total', userId], () => getUserCount(userId, year), {
    enabled: !!userId,
  });
}
