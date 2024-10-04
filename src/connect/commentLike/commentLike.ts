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

export default async function getCommentLike({ userId }: { userId: string }) {
  const q = query(
    collection(store, `${COLLECTIONS.USER}/${userId}/comment_like`),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) => doc.id);

  return data;
}

// 좋아요  토글
export async function toggleCommentLike(commentId: string, userId: string) {
  const q = query(
    collection(store, `${COLLECTIONS.USER}/${userId}/comment_like`),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) => doc.id);

  if (data.includes(commentId)) {
    deleteDoc(
      doc(store, `${COLLECTIONS.USER}/${userId}/comment_like/${commentId}`),
    );
  } else {
    await setDoc(
      doc(
        collection(store, `${COLLECTIONS.USER}/${userId}/comment_like`),
        commentId,
      ),
      {
        createdTime: new Date(),
      },
      { merge: true },
    );
  }
}
