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

export async function getUid(showId: string) {
  try {
    const q = query(
      collection(store, COLLECTIONS.USER),
      where('showId', '==', showId),
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    } else {
      console.log('Admin user not found');
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
}
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
