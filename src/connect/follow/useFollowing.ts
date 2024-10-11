'use client';
import { useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import useUser from '@connect/user/useUser';
import getFollowing from './follow';

export default function useFollowing() {
  const uid = useUser()?.uid;
  const client = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = onSnapshot(
      query(
        collection(store, `${COLLECTIONS.USER}/${uid}/following`),
        orderBy('userId', 'desc'),
      ),
      (snapshot) => {
        const newData = snapshot.docs.map((doc) => doc.id);
        client.setQueryData(['following', uid], newData);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, uid]);

  const { data } = useQuery(
    ['following', uid],
    () => getFollowing({ uid: uid as string }),
    {
      enabled: !!uid,
    },
  );

  return { data };
}
