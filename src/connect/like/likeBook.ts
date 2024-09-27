import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';

export default async function getBookLike({ userId }: { userId: string }) {
  const q = query(
    collection(store, `${COLLECTIONS.USER}/${userId}/like`),
    orderBy('createdTime', 'desc'),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) => doc.id);

  return data;
}

// 좋아요 토글
export async function toggleLike(bookId: string, userId: string) {
  const q = query(collection(store, `${COLLECTIONS.USER}/${userId}/like`));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) => doc.id);

  if (data.includes(bookId)) {
    deleteDoc(doc(store, `${COLLECTIONS.USER}/${userId}/like/${bookId}`));
  } else {
    await setDoc(
      doc(collection(store, `${COLLECTIONS.USER}/${userId}/like`), bookId),
      {
        createdTime: new Date(),
      },
      { merge: true },
    );
  }
}
