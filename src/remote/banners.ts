import { collection, getDocs } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { COLLECTIONS } from '@constants';
import { Banner } from '@models/banner';

export async function getBanners() {
  const snapshot = await getDocs(collection(store, COLLECTIONS.BANNERS));

  const data = snapshot.docs.map((doc) => ({
    ...(doc.data() as Banner),
  }));

  return data;
}
