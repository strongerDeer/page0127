'use client';
import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaeApp';
import { Banner } from '@models/banner';

import { collection, getDocs, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export async function getFirebaseDocs() {
  const dataQuery = query(collection(store, COLLECTIONS.BANNERS));

  const snapshot = await getDocs(dataQuery);
  const data = snapshot.docs.map((doc) => ({
    ...(doc.data() as Banner),
  }));

  return data;
}

export default function useGetBanners() {
  const [data, setData] = useState<Banner[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    try {
      setIsLoading(true);
      getFirebaseDocs().then((data) => {
        setData(data);
      });
    } catch (error) {
      console.log('에러발생', error);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error };
}
