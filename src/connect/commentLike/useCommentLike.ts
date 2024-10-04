'use client';
import { useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import useUser from '@connect/user/useUser';
import getCommentLike from './commentLike';

export default function useCommentLike() {
  const userId = useUser()?.uid;
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(
      query(
        collection(store, `${COLLECTIONS.USER}/${userId}/comment_like`),
        orderBy('createdTime', 'desc'),
      ),
      (snapshot) => {
        const newLike = snapshot.docs.map((doc) => doc.id);
        client.setQueryData(['comment-like'], newLike);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [client, userId]);

  const { data } = useQuery(
    ['comment-like'],
    () => getCommentLike({ userId: userId as string }),
    {
      enabled: !!userId,
    },
  );

  return { data };
}
