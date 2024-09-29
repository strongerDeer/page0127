import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { COLLECTIONS } from '@constants';
import { I_Banner } from '.';
import { BannerType, bannerConfig } from './useBanner';

const today = new Date();

export async function getBanners(type: BannerType) {
  const q = query(
    collection(store, COLLECTIONS.BANNERS),
    ...bannerConfig[type],
  );
  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as I_Banner),
  }));

  return data;
}

export async function getEndBanners() {
  const q = query(
    collection(store, COLLECTIONS.BANNERS),
    where('endDate', '<=', today),
  );
  const snapshot = await getDocs(q);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as I_Banner),
  }));

  return data;
}

export function deleteBanner(bannerId: string) {
  const bannerDoc = doc(collection(store, COLLECTIONS.BANNERS), bannerId);

  return deleteDoc(bannerDoc);
}
