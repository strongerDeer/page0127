import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { BookLike } from '@models/bookLike';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

export default async function getBookLikes({ userId }: { userId: string }) {
  const snapshot = await getDocs(
    query(
      collection(store, COLLECTIONS.BOOK_LIKE),
      where('userId', '==', userId),
      orderBy('order', 'asc'),
    ),
  );

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as BookLike,
  );
}
