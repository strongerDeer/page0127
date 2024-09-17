import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import { User } from '@connect/user';
import {
  collection,
  documentId,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

export default async function getLifeUsers(userIds: string[]) {
  const userQuery = query(
    collection(store, COLLECTIONS.USER),
    where(documentId(), 'in', userIds),
  );

  const snapshot = await getDocs(userQuery);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as User),
  }));
}
