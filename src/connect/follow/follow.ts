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

export async function getFollower({ userId }: { userId: string }) {
  const q = query(
    collection(store, `${COLLECTIONS.USER}/${userId}/follower`),
    orderBy('createdTime', 'desc'),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) => doc.id);

  return data;
}
export async function getFollowing({ userId }: { userId: string }) {
  const q = query(
    collection(store, `${COLLECTIONS.USER}/${userId}/following`),
    orderBy('createdTime', 'desc'),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) => doc.id);

  return data;
}

// 팔로우 토글
export async function toggleFollow(bookId: string, userId: string) {
  const q = query(collection(store, `${COLLECTIONS.USER}/${userId}/follow`));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) => doc.id);

  if (data.includes(bookId)) {
    deleteDoc(doc(store, `${COLLECTIONS.USER}/${userId}/follow/${bookId}`));
  } else {
    await setDoc(
      doc(collection(store, `${COLLECTIONS.USER}/${userId}/follow`), bookId),
      {
        createdTime: new Date(),
      },
      { merge: true },
    );
  }
}
