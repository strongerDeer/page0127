import { useQuery, useQueryClient } from 'react-query';
import { getBanners } from './banner';
import { useEffect } from 'react';
import { COLLECTIONS } from '@constants';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { I_Banner } from '.';

const today = new Date();
export type BannerType = 'active' | 'scheduled' | 'expired';

export const bannerConfig = {
  active: [where('startDate', '<=', today), where('endDate', '>=', today)],
  scheduled: [where('startDate', '>', today)],
  expired: [where('endDate', '<', today)],
};

export default function useBanner(type: BannerType) {
  const client = useQueryClient();

  useEffect(() => {
    const q = query(
      collection(store, COLLECTIONS.BANNERS),
      ...bannerConfig[type],
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as I_Banner),
      }));
      client.setQueryData(type, newData);
    });

    return () => unsubscribe();
  }, [client, type]);

  return useQuery(type, () => getBanners(type), { suspense: true });
}
