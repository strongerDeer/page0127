import {
  collection,
  getDocs,
  query,
  doc,
  getDoc,
  where,
} from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';

import { COLLECTIONS } from '@constants';
import { Book } from '@models/book';

export async function getBooks() {
  const snapshot = await getDocs(query(collection(store, COLLECTIONS.BOOKS)));
  const data = snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Book,
  );

  return data;
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

export async function getReadBooks(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(store, COLLECTIONS.BOOKS),
      where('readUser', 'array-contains', userId),
    ),
  );
  const data = snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Book,
  );

  return data;
}
