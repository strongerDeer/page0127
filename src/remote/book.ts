import {
  collection,
  getDocs,
  QuerySnapshot,
  query,
  limit,
  startAfter,
  orderBy,
  doc,
  getDoc,
  where,
} from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';

import { COLLECTIONS } from '@constants';
import { Book } from '@models/book';
import useUser from '@hooks/auth/useUser';

export async function getBooks() {
  let snapshot = await getDocs(query(collection(store, COLLECTIONS.BOOKS)));

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Book,
  );
}

export async function getBook(id: string) {
  const snapshot = await getDoc(doc(store, COLLECTIONS.BOOKS, id));

  return {
    ...(snapshot.data() as Book),
  };
}

export async function getLikeBooks(userId: string) {
  let snapshot = await getDocs(
    query(
      collection(store, COLLECTIONS.BOOKS),
      where('likeUsers', 'array-contains', userId),
    ),
  );

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Book,
  );
}
