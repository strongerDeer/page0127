import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
} from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';

import { COLLECTIONS } from '@constants';
import { User } from './';

export async function getUser(id: string) {
  const snapshot = await getDoc(doc(store, COLLECTIONS.USER, id));

  return snapshot.data() as User;
}

export default async function getUserCount(userId: string, year: string) {
  const snapshot = await getDoc(
    doc(collection(store, `${COLLECTIONS.USER}/${userId}/total`), year),
  );
  const data = snapshot.data();
  return data;
}
