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
} from 'firebase/firestore';
import { store } from '@firebase/firebaeApp';

import { COLLECTIONS } from '@constants';
import { Book } from '@models/book';

// pageParam 지금 보이고있는 맨 마지막요소
export async function getBooks(pageParam?: QuerySnapshot<Book>) {
  const COLLECTION_NAME = COLLECTIONS.BOOKS;
  const option = orderBy('createdTime', 'desc');
  const dataQuery = pageParam
    ? query(
        collection(store, COLLECTION_NAME),
        option,
        startAfter(pageParam),
        limit(10),
      )
    : query(collection(store, COLLECTION_NAME), option, limit(20));

  const snapshot = await getDocs(dataQuery);

  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  const data = snapshot.docs.map((doc) => ({
    ...(doc.data() as Book),
  }));

  return { data, lastVisible };
}
export async function getBook(id: string) {
  const snapshot = await getDoc(doc(store, COLLECTIONS.BOOKS, id));

  return {
    ...(snapshot.data() as Book),
  };
}
