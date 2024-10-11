import { User } from '@connect/user';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';

export default async function getFollowing({ uid }: { uid: string }) {
  const q = query(
    collection(store, `${COLLECTIONS.USER}/${uid}/following`),
    orderBy('userId', 'desc'),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) => doc.id);

  return data;
}

export async function getFollower({ uid }: { uid: string }) {
  const q = query(
    collection(store, `${COLLECTIONS.USER}/${uid}/follower`),
    orderBy('userId', 'desc'),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) => doc.id);

  return data;
}

export async function getFilteredUser(array: string[]) {
  const lists = array.filter((item) => !!item);

  const promises = lists.map((uid) =>
    getDoc(doc(collection(store, COLLECTIONS.USER), uid)),
  );

  const userSnapshot = await Promise.all(promises);
  const data = userSnapshot
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => ({
      id: snapshot.id,
      ...(snapshot.data() as User),
    }));

  return data;
}
