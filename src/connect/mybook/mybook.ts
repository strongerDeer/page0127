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

export async function getMyBook(uid: string, bookId: string) {
  const snapshot = await getDoc(
    doc(store, `${COLLECTIONS.USER}/${uid}/book/${bookId}`),
  );

  return {
    ...(snapshot.data() as Book),
  };
}

export async function removeMyBook(
  uid: string,
  bookId: string,
  data: Book,
  grade: string,
) {
  let categoryText = '기타';
  switch (data.category) {
    case '컴퓨터/모바일':
      categoryText = '컴퓨터모바일';
      break;
    case '소설/시/희곡':
      categoryText = '소설시희곡';
      break;
    case '에세이':
      categoryText = '에세이';
      break;
    case '경제경영':
      categoryText = '경제경영';
      break;
    case '인문학':
      categoryText = '인문학';
      break;
    case '자기계발':
      categoryText = '자기계발';
      break;
  }

  const book = await getDoc(doc(collection(store, COLLECTIONS.BOOKS), bookId));
  const readUser = book.data()?.readUser;

  // 전체 책 데이터에서 삭제
  if (readUser.length === 1 && readUser.includes(uid)) {
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
    [`category.${categoryText}`]: arrayRemove(bookId),
    total: arrayRemove(bookId),
    currentBook: increment(-1),
  });

  // 나의 책 데이터 삭제
  const myBookRef = doc(store, `${COLLECTIONS.USER}/${uid}/book/${bookId}`);
  return deleteDoc(myBookRef);
}
