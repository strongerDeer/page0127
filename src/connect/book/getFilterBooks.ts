import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { Book } from '@models/book';

import { collection, doc, getDoc } from 'firebase/firestore';

export async function getFilterBooks(like: string[]) {
  const booksPromises = like.map((bookId) =>
    getDoc(doc(collection(store, COLLECTIONS.BOOKS), bookId)),
  );

  const booksSnapshots = await Promise.all(booksPromises);

  const data = booksSnapshots
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => ({
      id: snapshot.id,
      ...(snapshot.data() as Book),
    }));

  return data;
}
