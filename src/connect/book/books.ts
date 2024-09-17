import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { Book } from '@connect/book';

import { collection, doc, getDoc } from 'firebase/firestore';

export async function getFilterBooks(like: string[]) {
  const lists = like.filter((item) => !!item);

  const booksPromises = lists.map((bookId) =>
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
