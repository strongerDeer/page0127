import { doc, getDoc } from 'firebase/firestore';
import { store } from '@firebase/firebaeApp';

import { COLLECTIONS } from '@constants';
import { User } from '@models/user';

export async function getUser(id: string) {
  const snapshot = await getDoc(doc(store, COLLECTIONS.USER, id));

  return snapshot.data() as User;
}
