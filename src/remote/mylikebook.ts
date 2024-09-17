import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { Book } from '@connect/book';
import {
  collection,
  documentId,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

export async function getMyLikeBook(bookIds: string[]) {
  const bookQuery = query(
    collection(store, COLLECTIONS.BOOKS),
    where(documentId(), 'in', bookIds),
  );

  const snapshot = await getDocs(bookQuery);

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Book,
  );
}
