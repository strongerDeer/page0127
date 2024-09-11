import {
  collection,
  getDocs,
  query,
  doc,
  getDoc,
  where,
  QuerySnapshot,
  limit,
  startAfter,
  orderBy,
} from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';

import { COLLECTIONS } from '@constants';
import { Book } from '@models/book';

export async function getBooks() {
  let bookQuery = query(
    collection(store, COLLECTIONS.BOOKS),
    orderBy('createdTime', 'desc'),
    limit(12),
  );
  const snapshot = await getDocs(bookQuery);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Book),
  }));

  return data;
}

// export async function getBooks(pageParam?: QuerySnapshot<Book>) {

//   if (pageParam) {
//     bookQuery = query(
//       collection(store, COLLECTIONS.BOOKS),
//       orderBy('createdTime', 'desc'),
//       startAfter(pageParam),
//       limit(12),
//     );
//   }

//   const snapshot = await getDocs(bookQuery);
//   const lastVisible = snapshot.docs[snapshot.docs.length - 1];

//   const items = snapshot.docs.map((doc) => ({
//     id: doc.id,
//     ...(doc.data() as Book),
//   }));

//   return { items, lastVisible };
// }

export async function getBook(id: string) {
  const snapshot = await getDoc(doc(store, COLLECTIONS.BOOKS, id));

  return {
    id: id,
    ...(snapshot.data() as Book),
  };
}

// export async function getLikeBooks({ userId }: { userId: string }) {
//   let snapshot = await getDocs(
//     query(
//       collection(store, COLLECTIONS.BOOKS),
//       where('likeUsers', 'array-contains', userId),
//     ),
//   );

//   return snapshot.docs.map((doc) => ({
//     id: doc.id,
//     ...(doc.data() as Book),
//   }));
// }

export async function getReadBooks(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(store, COLLECTIONS.BOOKS),
      where('readUser', 'array-contains', userId),
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
