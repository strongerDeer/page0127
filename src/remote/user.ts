import { doc, getDoc } from 'firebase/firestore';
import { store } from '@firebase/firebaeApp';

import { COLLECTIONS } from '@constants';

export async function geUser(id: string) {
  const snapshot = await getDoc(doc(store, COLLECTIONS.USER, id));

  return snapshot.data();
}
