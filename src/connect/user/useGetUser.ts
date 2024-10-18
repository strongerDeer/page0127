import { useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { getUserByUserId } from './user';
import { COLLECTIONS } from '@constants';

export default function useGetUser(userId: string) {
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(
      query(
        collection(store, `${COLLECTIONS.USER}`),
        where('userId', '==', userId),
      ),
      (snapshot) => {
        const newData = snapshot.docs[0]?.data();
        client.setQueryData([`${userId}`], newData);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, userId]);

  return useQuery([`${userId}`, userId], () => getUserByUserId(userId), {
    enabled: !!userId,
  });
}
