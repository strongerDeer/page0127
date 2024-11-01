import { useQuery, useQueryClient } from 'react-query';
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
      doc(collection(store, `${COLLECTIONS.USER}/${userId}/counter`), year),

      (snapshot) => {
        const newData = snapshot.data();
        client.setQueryData([`total-${year}`], newData);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, userId, year]);

  return useQuery([`total-${year}`, userId], () => getUserCount(userId, year), {
    enabled: !!userId,
  });
}
