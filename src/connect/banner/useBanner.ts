import { useQuery, useQueryClient } from 'react-query';
import { getBanners } from './banner';
import { useEffect } from 'react';
import { COLLECTIONS } from '@constants';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { store } from '@firebase/firebaseApp';
import { I_Banner } from '.';
import useUser from '@connect/user/useUser';

const today = new Date();
export type BannerType = 'default' | 'active' | 'scheduled' | 'expired';

export default function useBanner(type: BannerType) {
  const isLogin = !!useUser();
  const client = useQueryClient();

  useEffect(() => {
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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as I_Banner),
      }));
      client.setQueryData(type, newData);
    });

    return () => unsubscribe();
  }, [client, type, isLogin]);

  return useQuery(type, () => getBanners({ type, isLogin: isLogin }), {
    suspense: true,
  });
}
