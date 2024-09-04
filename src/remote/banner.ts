import { collection, getDocs, query, where } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { COLLECTIONS } from '@constants';
import { I_Banner } from '@models/banner';

export async function getBanners({ hasAccount }: { hasAccount: boolean }) {
  const bannerQuery = query(
    collection(store, COLLECTIONS.BANNERS),
    where('hasAccount', '==', hasAccount),
  );
  const snapshot = await getDocs(bannerQuery);

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as I_Banner),
  }));

  return data;
}
