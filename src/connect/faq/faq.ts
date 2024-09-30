import { collection, deleteDoc, doc, getDocs, query } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { COLLECTIONS } from '@constants';

import { FAQ } from '.';

export async function getFaq() {
  const q = query(collection(store, COLLECTIONS.FAQ));
  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as FAQ),
  }));

  return data;
}

export function deleteFAQ(faqId: string) {
  const q = doc(collection(store, COLLECTIONS.FAQ), faqId);
  return deleteDoc(q);
}
