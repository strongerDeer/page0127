import { collection, getDocs } from 'firebase/firestore';
import { store } from '@firebase/firebaeApp';
import { COLLECTIONS } from '@constants';
import { Book } from '@models/book';

export async function getMyBooks(uid: string) {
  console.log(`${COLLECTIONS.USER}/${uid}/book`);

  const snapshot = await getDocs(
    collection(store, `${COLLECTIONS.USER}/${uid}/book`),
  );

  const data = snapshot.docs.map((doc) => ({
    ...(doc.data() as Book),
  }));

  return data;
}
