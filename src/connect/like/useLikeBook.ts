'use client';
import { useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import useUser from '@connect/user/useUser';
import getBookLike from './likeBook';
import { LikeBook } from '.';

export default function useLikeBook() {
  const userId = useUser()?.uid;
  const client = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(collection(store, COLLECTIONS.BOOK_LIKE), userId),
      (snapshot) => {
        const newLike = snapshot.data()?.bookList;
        client.setQueryData(['likeBooks'], newLike);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client, userId]);

  const { data } = useQuery(
    ['likeBooks'],
    () => getBookLike({ userId: userId as string }),
    {
      enabled: !!userId,
    },
  );

  return { data };
}
