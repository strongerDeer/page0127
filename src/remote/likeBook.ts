import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { LikeBook } from '@models/likeBook';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

export default async function getBookLikes({ userId }: { userId: string }) {
  const snapshot = await getDocs(
    query(
      collection(store, COLLECTIONS.BOOK_LIKE),
      where('userId', '==', userId),
    ),
  );

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as LikeBook,
  );
}

export async function toggleLike(bookId: string, userId: string) {
  const findSnapshot = await getDocs(
    query(
      collection(store, COLLECTIONS.BOOK_LIKE),
      where('userId', '==', userId),
      where('bookId', '==', bookId),
    ),
  );

  if (findSnapshot.docs.length > 0) {
    // 삭제
    return await deleteDoc(doc(store, COLLECTIONS.BOOK_LIKE, userId));
  } else {
    // 생성
    return await setDoc(doc(store, COLLECTIONS.BOOK_LIKE, userId), {
      userId,
      bookId,
    });
  }
}
