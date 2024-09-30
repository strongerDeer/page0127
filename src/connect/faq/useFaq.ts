import { useQuery, useQueryClient } from 'react-query';

import { useEffect } from 'react';
import { COLLECTIONS } from '@constants';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { FAQ } from '.';
import { getFaq } from './faq';

export default function useFaq() {
  const client = useQueryClient();

  useEffect(() => {
    const q = query(collection(store, COLLECTIONS.FAQ));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as FAQ),
      }));
      client.setQueryData(['faq'], newData);
    });

    return () => unsubscribe();
  }, [client]);

  const { data } = useQuery(['faq'], () => getFaq());

  return { data };
}
