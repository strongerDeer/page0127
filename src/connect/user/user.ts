import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';

import { COLLECTIONS } from '@constants';
import { User } from '.';

export async function getUser(userId: string) {
  const snapshot = await getDoc(
    doc(collection(store, `${COLLECTIONS.USER}`), userId),
  );

  return snapshot.data() as User;
}

export default async function getUserCount(userId: string, year: string) {
  const snapshot = await getDoc(
    doc(collection(store, `${COLLECTIONS.USER}/${userId}/counter`), year),
  );
  const data = snapshot.data();

  return data;
}

export async function getUserByUserId(userId: string) {
  const snapshot = await getDocs(
    query(
      collection(store, `${COLLECTIONS.USER}`),
      where('userId', '==', userId),
    ),
  );

  return snapshot.docs[0].data() as User;
}
