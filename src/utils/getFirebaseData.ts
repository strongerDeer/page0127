import { COLLECTIONS } from '@constants';
import { store } from '@firebase/firebaseApp';
import {
  QueryConstraint,
  collection,
  getDocs,
  query,
} from 'firebase/firestore';
import { useEffect } from 'react';

const getFireBaseData = async <T>(
  col: (typeof COLLECTIONS)[keyof typeof COLLECTIONS],
  option?: QueryConstraint[],
): Promise<T[]> => {
  let q = query(collection(store, col));
  if (option) {
    q = query(collection(store, col), ...option);
  }
  const snapshot = await getDocs(q);

  const data = snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as T & { id: string },
  );

  return data;
};

export default getFireBaseData;
