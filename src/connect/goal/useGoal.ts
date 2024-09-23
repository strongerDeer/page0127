'use client';

import useUser from '@connect/user/useUser';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { collection, doc, onSnapshot, query } from 'firebase/firestore';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import getGoal from './goal';

export default function useGoal() {
  const userId = useUser()?.uid;
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(
      doc(collection(store, `${COLLECTIONS.USER}/${userId}/goal`), 'goal'),
      (snapshot) => {
        const newData = snapshot.data();
        client.setQueryData(['goal'], newData);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, userId]);

  const { data } = useQuery(
    ['goal'],
    () => getGoal({ userId: userId as string }),
    {
      enabled: !!userId,
    },
  );

  return { data };
}
