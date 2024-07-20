import { useQuery, useQueryClient } from 'react-query';
import { getClubs } from '@remote/club';
import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { COLLECTIONS } from '@constants';
import { Club } from '@models/applyClub';

export default function useClubs() {
  const client = useQueryClient();
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(store, COLLECTIONS.CLUBS),
      (snapshot) => {
        const newClubs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Club),
        }));
        client.setQueryData(['clubs'], newClubs);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [client]);
  return useQuery(['clubs'], () => getClubs());
}
