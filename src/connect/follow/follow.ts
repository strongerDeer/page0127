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

export default async function getFollowing({ userId }: { userId: string }) {
  const q = query(
    collection(store, `${COLLECTIONS.USER}/${userId}/following`),
    orderBy('userId', 'desc'),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) => doc.id);

  return data;
}

export async function getFollower({ userId }: { userId: string }) {
  const q = query(
    collection(store, `${COLLECTIONS.USER}/${userId}/follower`),
    orderBy('userId', 'desc'),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) => doc.id);

  return data;
}

export async function getFilteredUser(array: string[]) {
  const lists = array.filter((item) => !!item);

  const promises = lists.map((userId) =>
    getDoc(doc(collection(store, COLLECTIONS.USER), userId)),
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
