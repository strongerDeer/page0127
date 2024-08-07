import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { COLLECTIONS } from '@constants';
import { Book } from '@models/book';

export async function getMyBooks(uid: string) {
  const snapshot = await getDocs(
    query(
      collection(store, `${COLLECTIONS.USER}/${uid}/book`),
      orderBy('readDate', 'asc'),
    ),
  );

  const data = snapshot.docs.map((doc) => ({
    ...(doc.data() as Book),
  }));

  return data;
}

export async function getMyBook(uid: string, bookId: string) {
  const snapshot = await getDoc(
    doc(store, `${COLLECTIONS.USER}/${uid}/book/${bookId}`),
  );

  return {
    ...(snapshot.data() as Book),
  };
}
