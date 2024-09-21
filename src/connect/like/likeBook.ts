import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

export default async function getBookLike({ userId }: { userId: string }) {
  const q = doc(collection(store, COLLECTIONS.BOOK_LIKE), userId);
  const snapshot = await getDoc(q);
  const data = snapshot.data()?.bookList;
  return data;
}

// 좋아요 토글
export async function toggleLike(bookId: string, userId: string) {
  const q = doc(collection(store, COLLECTIONS.BOOK_LIKE), userId);
  const snapshot = await getDoc(q);

  if (!snapshot.exists()) {
    // 새로 생성
    await setDoc(q, {
      bookList: arrayUnion(bookId),
    });
  } else {
    if (snapshot.data().bookList.includes(bookId)) {
      await updateDoc(q, { bookList: arrayRemove(bookId) });
    } else {
      await updateDoc(q, { bookList: arrayUnion(bookId) });
    }
  }
}
