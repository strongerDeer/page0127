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

export async function getMyBooks(uid: string) {
  const snapshot = await getDocs(
    query(
      collection(store, `${COLLECTIONS.USER}/${uid}/book`),
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
  const uid = await getDocs(
    query(
      collection(store, `${COLLECTIONS.USER}`),
      where('userId', '==', userId),
    ),
  );

  const snapshot = await getDoc(
    doc(store, `${COLLECTIONS.USER}/${uid.docs[0].data().uid}/book/${bookId}`),
  );

  return {
    ...(snapshot.data() as Book),
  };
}

export async function removeMyBook(
  uid: string,
  bookId: string,
  grade: string,
  readDate: string,
) {
  const book = (
    await getDoc(doc(collection(store, COLLECTIONS.BOOKS), bookId))
  ).data();

  const { readUser, category, publisher } = book as Book;
  const [year, month] = readDate.split('-');

  console.log(year, month);
  // 전체 책 데이터에서 삭제
  if (readUser?.length === 1 && readUser.includes(uid)) {
    const bookRef = doc(store, `${COLLECTIONS.BOOKS}/${bookId}`);
    await deleteDoc(bookRef);
  } else {
    // 책 데이터에서 점수 및 읽은 유저 삭제
    await updateDoc(doc(collection(store, COLLECTIONS.BOOKS), bookId), {
      readUser: arrayRemove(uid),
      [`grade.${grade}`]: arrayRemove(uid),
    });
  }
  // 나의 정보
  await updateDoc(doc(collection(store, COLLECTIONS.USER), uid), {
    currentBook: increment(-1),
    totalBook: increment(-1),
  });

  // 나의 책 데이터 삭제
  const myBookRef = doc(store, `${COLLECTIONS.USER}/${uid}/book/${bookId}`);

  const totalQuery = doc(
    collection(store, `${COLLECTIONS.USER}/${uid}/counter`),
    'total',
  );

  await setDoc(
    totalQuery,
    {
      totalBook: arrayRemove(bookId),
      date: {
        [`${year}-${month}`]: arrayRemove(bookId),
      },
      category: { [category.replaceAll('/', '')]: arrayRemove(bookId) },
      grade: {
        [`${grade}`]: arrayRemove(bookId),
      },
      publisher: { [publisher]: arrayRemove(bookId) },
    },
    { merge: true },
  );

  return deleteDoc(myBookRef);
}
