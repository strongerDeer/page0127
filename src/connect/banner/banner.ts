import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { COLLECTIONS } from '@constants';
import { I_Banner } from '.';
import { BannerType } from './useBanner';

const today = new Date();

export async function getBanners({
  type,
  isLogin,
}: {
  type: BannerType;
  isLogin: Boolean;
}) {
  const bannerConfig = {
    default: [
      where('startDate', '<=', today),
      where('endDate', '>=', today),
      where('view', '!=', isLogin ? 'logout' : 'login'),
    ],
    active: [where('startDate', '<=', today), where('endDate', '>=', today)],
    scheduled: [where('startDate', '>', today)],
    expired: [where('endDate', '<', today)],
  };

  const q = query(
    collection(store, COLLECTIONS.BANNERS),
    ...bannerConfig[type],
    orderBy('startDate', 'desc'),
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
