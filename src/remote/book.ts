import { store } from '@firebase/firebaeApp';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

import { Book } from '@models/Book';

export async function getBooks() {
  const TEXT = 'books';
  const snapshot = await getDocs(
    query(collection(store, TEXT), orderBy('createdAt', 'desc')),
  );

  const data = snapshot.docs.map((doc) => ({
    ...(doc.data() as Book),
  }));

  return data;
}
