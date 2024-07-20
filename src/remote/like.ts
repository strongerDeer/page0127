import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

export default async function getLikes({ userId }: { userId: string }) {
  const snapshot = await getDocs(
    query(
      collection(store, COLLECTIONS.LIKE),
      where('userId', '==', userId),
      orderBy('order', 'asc'),
    ),
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
