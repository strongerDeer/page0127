'use client';
import { useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import useUser from '@connect/user/useUser';
import getBookLike from './likeBook';

export default function useLikeBook() {
  const uid = useUser()?.uid;
  const client = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = onSnapshot(
      query(
        collection(store, `${COLLECTIONS.USER}/${uid}/like`),
        orderBy('createdTime', 'desc'),
      ),
      (snapshot) => {
        const newLike = snapshot.docs.map((doc) => doc.id);
        client.setQueryData(['likeBooks'], newLike);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, uid]);

  const { data } = useQuery(
    ['likeBooks'],
    () => getBookLike({ userId: uid as string }),
    {
      enabled: !!uid,
    },
  );

  return { data };
}
