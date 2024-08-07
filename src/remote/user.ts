import { doc, getDoc } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';

import { COLLECTIONS } from '@constants';
import { User } from '@models/user';

export async function getUser(id: string) {
  const snapshot = await getDoc(doc(store, COLLECTIONS.USER, id));

  return snapshot.data() as User;
}
