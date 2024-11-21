'use client';
import { useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import useUser from '@connect/user/useUser';
import getFollowing from './follow';

export default function useFollowing() {
  const userId = useUser()?.userId;
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(
      query(
        collection(store, `${COLLECTIONS.USER}/${userId}/following`),
        orderBy('userId', 'desc'),
      ),
      (snapshot) => {
        const newData = snapshot.docs.map((doc) => doc.id);
        client.setQueryData(['following', userId], newData);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, userId]);

  const { data } = useQuery(
    ['following', userId],
    () => getFollowing({ userId: userId as string }),
    {
      enabled: !!userId,
    },
  );

  return { data };
}
