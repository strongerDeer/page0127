import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export default async function getGoal({ uid }: { uid: string }) {
  const q = doc(collection(store, `${COLLECTIONS.USER}/${uid}/goal`), 'goal');
  const snapshot = await getDoc(q);
  return snapshot.data();
}

export async function updateGoal({ uid, data }: { uid: string; data: any }) {
  const q = doc(collection(store, `${COLLECTIONS.USER}/${uid}/goal`), 'goal');

  await setDoc(q, data);
}

export async function updateUserGoal(uid: string, num: number) {
  await updateDoc(doc(store, COLLECTIONS.USER, uid), {
    currentGoal: num,
  });
}
