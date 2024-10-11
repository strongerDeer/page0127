'use client';

import useUser from '@connect/user/useUser';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import getGoal from './goal';

export default function useGoal() {
  const uid = useUser()?.uid;
  const client = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = onSnapshot(
      doc(collection(store, `${COLLECTIONS.USER}/${uid}/goal`), 'goal'),
      (snapshot) => {
        const newData = snapshot.data();
        client.setQueryData(['goal'], newData);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, uid]);

  const { data } = useQuery(['goal'], () => getGoal({ uid: uid as string }), {
    enabled: !!uid,
  });

  return { data };
}
