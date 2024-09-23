import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

export default async function getGoal({ userId }: { userId: string }) {
  const q = doc(
    collection(store, `${COLLECTIONS.USER}/${userId}/goal`),
    'goal',
  );
  const snapshot = await getDoc(q);
  return snapshot.data();
}

export async function updateGoal({
  userId,
  data,
}: {
  userId: string;
  data: any;
}) {
  const q = doc(
    collection(store, `${COLLECTIONS.USER}/${userId}/goal`),
    'goal',
  );

  await setDoc(q, data);
}

export async function updateUserGoal(id: string, num: number) {
  await updateDoc(doc(store, COLLECTIONS.USER, id), {
    goal: num,
  });
}
