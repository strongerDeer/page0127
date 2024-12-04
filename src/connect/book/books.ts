import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { Book } from '@connect/book';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import getFireBaseData from '@utils/getFirebaseData';

export async function getBook(id: string) {
  const snapshot = await getDoc(doc(store, COLLECTIONS.BOOKS, id));

  return {
    id: id,
    ...(snapshot.data() as Book),
  };
}

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

export async function getReadBooks(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(store, `${COLLECTIONS.USER}/${userId}/book`),
      orderBy('readDate', 'desc'),
    ),
  );
  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Book),
  }));

  return data;
}

export async function getSearchBooks(keyword: string) {
  const searchQuery = query(
    collection(store, COLLECTIONS.BOOKS),
    // keyword로 시작하는 모든 책 찾기
    where('title', '>=', keyword),
    where('title', '<=', keyword + '\uf8ff'),
  );

  const snapshot = await getDocs(searchQuery);

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Book) }));
}

export async function getTopLifeBooks() {
  return await getFireBaseData<Book>(COLLECTIONS.BOOKS, [
    orderBy('grade10Count', 'desc'),
    orderBy('readUserCount', 'desc'),
    orderBy('createdTime', 'desc'),
  ]);
}

export async function getMostReadBooks() {
  return await getFireBaseData<Book>(COLLECTIONS.BOOKS, [
    orderBy('readUserCount', 'desc'),
    orderBy('createdTime', 'desc'),
  ]);
}
