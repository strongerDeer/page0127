import {
  collection,
  getDocs,
  query,
  doc,
  getDoc,
  orderBy,
  deleteDoc,
  updateDoc,
  arrayRemove,
  increment,
  where,
  setDoc,
} from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';

import { COLLECTIONS } from '@constants';
import { Book } from '@connect/book';

export async function getMyBooks(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(store, `${COLLECTIONS.USER}/${userId}/book`),
      orderBy('readDate', 'desc'),
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

export async function getMyBook(userId: string, bookId: string) {
  const snapshot = await getDoc(
    doc(store, `${COLLECTIONS.USER}/${userId}/book/${bookId}`),
  );

  return {
    ...(snapshot.data() as Book),
  };
}

export async function removeMyBook(
  userId: string,
  bookId: string,
  grade: string,
  readDate: string,
) {
  const book = (
    await getDoc(doc(collection(store, COLLECTIONS.BOOKS), bookId))
  ).data();

  const { readUser, category, publisher, page } = book as Book;
  const [year, month] = readDate.split('-');

  // 전체 책 데이터에서 삭제
  if (readUser?.length === 1 && readUser.includes(userId)) {
    const bookRef = doc(store, `${COLLECTIONS.BOOKS}/${bookId}`);
    await deleteDoc(bookRef);
  } else {
    // 책 데이터에서 점수 및 읽은 유저 삭제
    await updateDoc(doc(collection(store, COLLECTIONS.BOOKS), bookId), {
      readUser: arrayRemove(userId),
      readUserCount: increment(-1),
      [`grade.${grade}`]: arrayRemove(userId),
      grade10Count: grade === '10' ? increment(-1) : increment(0),
    });
  }
  // 나의 정보
  await updateDoc(doc(collection(store, COLLECTIONS.USER), userId), {
    totalBook: increment(-1),
    totalPage: increment(-page),
    [`totalCategory.${category.replaceAll('/', '')}`]: increment(-1),
    [`totalPublisher.${publisher}`]: increment(-1),
  });

  // 나의 책 데이터 삭제
  const myBookRef = doc(store, `${COLLECTIONS.USER}/${userId}/book/${bookId}`);

  const totalQuery = doc(
    collection(store, `${COLLECTIONS.USER}/${userId}/counter`),
    year,
  );

  await setDoc(
    totalQuery,
    {
      totalBook: increment(-1),
      totalPage: increment(-page),
      date: {
        [`${year}-${month}`]: increment(-1),
      },
      category: { [category.replaceAll('/', '')]: increment(-1) },
      grade: {
        [`${grade}`]: increment(-1),
      },
      publisher: { [publisher]: increment(-1) },
    },
    { merge: true },
  );

  return deleteDoc(myBookRef);
}
