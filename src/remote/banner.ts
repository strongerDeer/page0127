import { store } from '@firebase/firebaeApp';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

import { Banner } from '@models/Banner';

export async function getBanners() {
  const TEXT = 'banners';
  const snapshot = await getDocs(
    query(collection(store, TEXT), orderBy('createdAt', 'desc')),
  );

  const data = snapshot.docs.map((doc) => ({
    ...(doc.data() as Banner),
  }));

  return data;
}
